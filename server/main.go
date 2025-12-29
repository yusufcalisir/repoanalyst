package main

import (
	"encoding/base64"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"math"
	"net/http"
	"os"
	"path/filepath"
	"regexp"
	"sort"
	"strings"
	"sync"
	"time"

	"github.com/go-pdf/fpdf"
)

// ==================== GITHUB API TYPES ====================

type GitHubUser struct {
	Login     string `json:"login"`
	AvatarURL string `json:"avatar_url"`
	Name      string `json:"name"`
	Email     string `json:"email"`
}

type GitHubRepoListing struct {
	ID       int64  `json:"id"`
	FullName string `json:"full_name"`
	Name     string `json:"name"`
	Owner    struct {
		Login string `json:"login"`
	} `json:"owner"`
	Description     string    `json:"description"`
	DefaultBranch   string    `json:"default_branch"`
	Language        string    `json:"language"`
	StargazersCount int       `json:"stargazers_count"`
	ForksCount      int       `json:"forks_count"`
	Private         bool      `json:"private"`
	UpdatedAt       time.Time `json:"updated_at"`
	PushedAt        time.Time `json:"pushed_at"`
}

type GitHubCommit struct {
	SHA    string `json:"sha"`
	Commit struct {
		Message string `json:"message"`
		Author  struct {
			Name  string    `json:"name"`
			Email string    `json:"email"`
			Date  time.Time `json:"date"`
		} `json:"author"`
	} `json:"commit"`
}

type GitHubContributor struct {
	Login         string `json:"login"`
	Contributions int    `json:"contributions"`
}

type GitHubContent struct {
	Content  string `json:"content"`
	Encoding string `json:"encoding"`
}

type GitHubTreeResponse struct {
	SHA       string           `json:"sha"`
	Tree      []GitHubTreeNode `json:"tree"`
	Truncated bool             `json:"truncated"`
}

type GitHubTreeNode struct {
	Path string `json:"path"`
	Mode string `json:"mode"`
	Type string `json:"type"`
	Size int    `json:"size"`
}

// GitHub Stats API types
type CommitActivityWeek struct {
	Total int   `json:"total"` // Total commits this week
	Week  int64 `json:"week"`  // Unix timestamp of week start
	Days  []int `json:"days"`  // Daily commit counts (Sun-Sat)
}

type CodeFrequencyWeek struct {
	Week      int `json:"week"`      // Unix timestamp
	Additions int `json:"additions"` // Lines added
	Deletions int `json:"deletions"` // Lines removed (negative in API, we store positive)
}

// ==================== APPLICATION TYPES ====================

type GitHubConnection struct {
	IsConnected  bool      `json:"isConnected"`
	Username     string    `json:"username"`
	AvatarURL    string    `json:"avatarUrl"`
	Name         string    `json:"name"`
	Organization string    `json:"organization"`
	ConnectedAt  time.Time `json:"connectedAt"`
	RepoCount    int       `json:"repoCount"`
}

type DiscoveredRepo struct {
	ID            int64     `json:"id"`
	FullName      string    `json:"fullName"`
	Name          string    `json:"name"`
	Owner         string    `json:"owner"`
	Description   string    `json:"description"`
	DefaultBranch string    `json:"defaultBranch"`
	Language      string    `json:"language"`
	Stars         int       `json:"stars"`
	Forks         int       `json:"forks"`
	Private       bool      `json:"private"`
	UpdatedAt     time.Time `json:"updatedAt"`
	AnalysisState string    `json:"analysisState"` // "none", "analyzing", "ready"
}

type RepoAnalysis struct {
	FetchedAt         time.Time                    `json:"fetchedAt"`
	RepoAgeMonths     int                          `json:"repoAgeMonths"`
	DaysSinceLastPush int                          `json:"daysSinceLastPush"`
	TotalCommits      int                          `json:"totalCommits"`
	CommitsLast30Days int                          `json:"commitsLast30Days"`
	CommitsTrend      string                       `json:"commitsTrend"`
	ContributorCount  int                          `json:"contributorCount"`
	DependencyCount   int                          `json:"dependencyCount"`
	FileCount         int                          `json:"fileCount"`
	DirectoryCount    int                          `json:"directoryCount"`
	TopDirectories    []DirectoryInfo              `json:"topDirectories"`
	Dependencies      []DependencyDetail           `json:"dependencies"`
	RecentCommits     []CommitSummary              `json:"recentCommits,omitempty"`
	CommitTimeline    []CommitTimelinePoint        `json:"commitTimeline"`
	CommitActivity    []CommitActivityWeek         `json:"commitActivity,omitempty"`
	FilesByExtension  map[string]int               `json:"filesByExtension"`
	ActivityScore     float64                      `json:"activityScore"`
	StalenessScore    float64                      `json:"stalenessScore"`
	TeamRiskScore     float64                      `json:"teamRiskScore"`
	Trajectory        *TrajectoryAnalysis          `json:"trajectory,omitempty"`
	Impact            *ImpactAnalysis              `json:"impact,omitempty"`
	Deps              *DependencyAnalysis          `json:"deps,omitempty"`
	Concentration     *ConcentrationAnalysis       `json:"concentration,omitempty"`
	Temporal          *TemporalAnalysis            `json:"temporal,omitempty"`
	BusFactor         *BusFactorAnalysis           `json:"busFactor,omitempty"`
	DocDrift          *DocDriftAnalysis            `json:"docDrift,omitempty"`
	IntentAnalysis    *IntentDistribution          `json:"intentAnalysis,omitempty"`
	StructuralDepth   *StructuralDepthAnalysis     `json:"structuralDepth,omitempty"`
	Volatility        *ActivityVolatility          `json:"volatility,omitempty"`
	TestSurface       *TestSurfaceAnalysis         `json:"testSurface,omitempty"`
	SecurityAnalysis  *SecurityConsistencyAnalysis `json:"securityAnalysis,omitempty"`
}

// ==================== TRAJECTORY ANALYSIS TYPES ====================

type TrajectorySnapshot struct {
	Date        string  `json:"date"`        // ISO week date (YYYY-WXX)
	WeekStart   string  `json:"weekStart"`   // ISO date of week start
	CommitCount int     `json:"commitCount"` // Commits this week
	Additions   int     `json:"additions"`   // Lines added
	Deletions   int     `json:"deletions"`   // Lines removed
	ChurnScore  float64 `json:"churnScore"`  // |additions| + |deletions|
	RiskScore   float64 `json:"riskScore"`   // Computed risk level
	RiskDelta   float64 `json:"riskDelta"`   // Change from previous week
}

type TrajectoryAnalysis struct {
	Available       bool                 `json:"available"`
	Reason          string               `json:"reason,omitempty"`
	Snapshots       []TrajectorySnapshot `json:"snapshots"`
	VelocityTrend   string               `json:"velocityTrend"`   // accelerating, stable, decelerating
	VelocityFactor  float64              `json:"velocityFactor"`  // multiplier vs baseline
	OverallTrend    string               `json:"overallTrend"`    // increasing_risk, stable, decreasing_risk
	ConfidenceLevel string               `json:"confidenceLevel"` // high, medium, low
	TotalWeeks      int                  `json:"totalWeeks"`
	PeakRiskWeek    string               `json:"peakRiskWeek,omitempty"`
	PeakRiskScore   float64              `json:"peakRiskScore"`
}

// ==================== IMPACT & EXPOSURE TYPES ====================

type ImpactUnit struct {
	Name           string   `json:"name"`      // Module name from topology
	FilePaths      []string `json:"filePaths"` // Actual files in unit
	FileCount      int      `json:"fileCount"`
	FragilityScore float64  `json:"fragilityScore"` // 0-100 computed
	ExposureScope  string   `json:"exposureScope"`  // system-wide|external|transactional|downstream
	BlastRadius    int      `json:"blastRadius"`    // Transitive dependent count
	Trend          string   `json:"trend"`          // improving|stabilizing|stagnant|accelerating
	FanIn          int      `json:"fanIn"`          // Incoming edges (dependents)
	FanOut         int      `json:"fanOut"`         // Outgoing edges (dependencies)
	IsCyclic       bool     `json:"isCyclic"`       // Part of circular dependency
}

type ImpactAnalysis struct {
	Available     bool         `json:"available"`
	Reason        string       `json:"reason,omitempty"`
	ImpactUnits   []ImpactUnit `json:"impactUnits"`
	TotalModules  int          `json:"totalModules"`
	CriticalCount int          `json:"criticalCount"` // fragility >= 75
	HighCount     int          `json:"highCount"`     // fragility >= 50
	MediumCount   int          `json:"mediumCount"`   // fragility >= 25
	LowCount      int          `json:"lowCount"`      // fragility < 25
	MostFragile   string       `json:"mostFragile,omitempty"`
	LargestBlast  string       `json:"largestBlast,omitempty"`
}

// ==================== CHANGE CONCENTRATION TYPES ====================

type ChurnFile struct {
	Path        string  `json:"path"`
	CommitCount int     `json:"commitCount"`
	Percent     float64 `json:"percent"`
}

type ConcentrationAnalysis struct {
	Available            bool               `json:"available"`
	Reason               string             `json:"reason,omitempty"`
	Window               string             `json:"window"` // 7d, 30d, all
	TotalCommitsAnalyzed int                `json:"totalCommitsAnalyzed"`
	TotalFilesTouched    int                `json:"totalFilesTouched"`
	ConcentrationIndex   float64            `json:"concentrationIndex"` // 0-100%
	Hotspots             []ChurnFile        `json:"hotspots"`
	OwnershipRisk        *BusFactorAnalysis `json:"ownershipRisk,omitempty"`
}

// ==================== BUS FACTOR TYPES ====================

type FileOwnership struct {
	Path                string         `json:"path"`
	TopContributor      string         `json:"topContributor"`
	OwnershipPercentage float64        `json:"ownershipPercentage"`
	CommitDistribution  map[string]int `json:"commitDistribution"`
	EntropyScore        float64        `json:"entropyScore"`
	IsCritical          bool           `json:"isCritical"`
	RiskSignal          string         `json:"riskSignal"` // "silo", "shared", "distributed"
}

type ContributorSurface struct {
	Name               string   `json:"name"`
	CriticalFilesCount int      `json:"criticalFilesCount"`
	OwnedRiskArea      float64  `json:"ownedRiskArea"`  // percentage of system risk owned by this person
	KnowledgeSilos     []string `json:"knowledgeSilos"` // paths where they are the sole owner
}

type BusFactorAnalysis struct {
	Available           bool                 `json:"available"`
	Reason              string               `json:"reason,omitempty"`
	RiskLevel           string               `json:"riskLevel"` // "Low", "Moderate", "High"
	FileOwnerships      []FileOwnership      `json:"fileOwnerships"`
	ContributorSurfaces []ContributorSurface `json:"contributorSurfaces"`
	TotalContributors   int                  `json:"totalContributors"`
	BusFactor           int                  `json:"busFactor"`
}

// ==================== TEMPORAL HOTSPOT TYPES ====================

type TemporalHotspot struct {
	Path               string      `json:"path"`
	CommitCount        int         `json:"commitCount"`
	FrequencyBaseline  float64     `json:"frequencyBaseline"`
	ShortestIntervalHr float64     `json:"shortestIntervalHr"`
	MeanIntervalHr     float64     `json:"meanIntervalHr"`
	SeverityScore      float64     `json:"severityScore"`
	Classification     string      `json:"classification"` // burst | drift
	Timestamps         []time.Time `json:"timestamps"`
}

type TemporalAnalysis struct {
	Available        bool              `json:"available"`
	Reason           string            `json:"reason,omitempty"`
	BaselineFound    bool              `json:"baselineFound"`
	MedianFrequency  float64           `json:"medianFrequency"`
	TemporalHotspots []TemporalHotspot `json:"temporalHotspots"`
	WindowDays       int               `json:"windowDays"`
}

type DirectoryInfo struct {
	Path      string `json:"path"`
	FileCount int    `json:"fileCount"`
}

// ==================== REAL DEPENDENCY GRAPH TYPES ====================

type DependencyNode struct {
	ID                string  `json:"id"`            // File path
	Name              string  `json:"name"`          // Module/file name
	Language          string  `json:"language"`      // py, js, go, ts, or "external"
	Category          string  `json:"category"`      // internal | external
	Version           string  `json:"version"`       // from manifest
	LatestVersion     string  `json:"latestVersion"` // Latest available from registry
	Volatility        float64 `json:"volatility"`    // commit frequency in manifest
	Lag               string  `json:"lag"`           // major | minor | up-to-date | unknown
	RiskAmplification float64 `json:"riskAmplification"`
	FanIn             int     `json:"fanIn"`      // Incoming edges
	FanOut            int     `json:"fanOut"`     // Outgoing edges
	Centrality        float64 `json:"centrality"` // Betweenness centrality approximation
	RiskScore         float64 `json:"riskScore"`  // Computed risk (legacy/overview)
	IsCyclic          bool    `json:"isCyclic"`   // Part of cycle
}

type DependencyEdge struct {
	Source     string `json:"source"`     // Importer file path
	Target     string `json:"target"`     // Imported module/file
	ImportLine string `json:"importLine"` // Actual import statement
}

type DependencyAnalysis struct {
	Available     bool             `json:"available"`
	Reason        string           `json:"reason,omitempty"`
	Nodes         []DependencyNode `json:"nodes"`
	Edges         []DependencyEdge `json:"edges"`
	TotalNodes    int              `json:"totalNodes"`
	TotalEdges    int              `json:"totalEdges"`
	CyclicNodes   int              `json:"cyclicNodes"`
	HighRiskNodes []string         `json:"highRiskNodes,omitempty"`
	MaxFanIn      int              `json:"maxFanIn"`
	MaxFanOut     int              `json:"maxFanOut"`
}

type DependencyDetail struct {
	Name    string `json:"name"`
	Version string `json:"version"`
	Type    string `json:"type"`
}

type CommitSummary struct {
	SHA              string    `json:"sha"`
	Message          string    `json:"message"`
	Author           string    `json:"author"`
	Date             time.Time `json:"date"`
	Intent           string    `json:"intent"` // docs, perf, fix, refactor, feature, chore, test, unknown
	Confidence       float64   `json:"confidence"`
	TriggeringSignal string    `json:"triggeringSignal"`
}

type IntentDistribution struct {
	Available         bool               `json:"available"`
	Reason            string             `json:"reason,omitempty"`
	Intents           map[string]int     `json:"intents"`           // Count per intent
	Percentages       map[string]float64 `json:"percentages"`       // Distribution
	DominantIntent    string             `json:"dominantIntent"`    // Intent with highest count
	RecentFocusShift  string             `json:"recentFocusShift"`  // Summary of focus
	ConfidenceWarning bool               `json:"confidenceWarning"` // True if many "unknown" or low confidence
}

type StructuralDepthAnalysis struct {
	Available       bool        `json:"available"`
	MaxDepth        int         `json:"maxDepth"`
	MeanDepth       float64     `json:"meanDepth"`
	MedianDepth     float64     `json:"medianDepth"`
	FilesPerDepth   map[int]int `json:"filesPerDepth"`
	Imbalances      []string    `json:"imbalances"`
	SurfaceRatio    float64     `json:"surfaceRatio"`
	StructureStatus string      `json:"structureStatus"` // flat, layered, over-segmented
}

type ActivityVolatility struct {
	Available        bool     `json:"available"`
	BucketSize       string   `json:"bucketSize"` // "daily"
	BucketCounts     []int    `json:"bucketCounts"`
	BaselineActivity float64  `json:"baselineActivity"`
	VolatilityScore  float64  `json:"volatilityScore"` // CV: StdDev / Mean
	Classification   string   `json:"classification"`  // Low, Moderate, High
	BurstPeriods     []string `json:"burstPeriods"`    // ISO dates
	Interpretation   string   `json:"interpretation"`
}

type TestSurfaceAnalysis struct {
	Available             bool     `json:"available"`
	ProductionFileCount   int      `json:"productionFileCount"`
	TestFileCount         int      `json:"testFileCount"`
	SurfaceRatio          float64  `json:"surfaceRatio"` // (test / prod) * 100
	TestPercentage        float64  `json:"testPercentage"`
	Distribution          string   `json:"distribution"`   // co-located | centralized | mixed
	MismatchedDeps        bool     `json:"mismatchedDeps"` // true if test deps exist but no files
	TestDependenciesFound []string `json:"testDependenciesFound"`
	Interpretation        string   `json:"interpretation"`
}

type SecurityClaim struct {
	Claim             string   `json:"claim"`
	SupportingSignals []string `json:"supportingSignals"`
	Evidence          []string `json:"evidence"`       // list of files or deps
	Classification    string   `json:"classification"` // Supported, Weakly Supported, Uncorroborated
}

type SecurityConsistencyAnalysis struct {
	Available      bool            `json:"available"`
	Claims         []SecurityClaim `json:"claims"`
	OverallStatus  string          `json:"overallStatus"`
	Interpretation string          `json:"interpretation"`
}

type CommitTimelinePoint struct {
	Date  string `json:"date"`
	Count int    `json:"count"`
}

type ProjectWithAnalysis struct {
	Repo     DiscoveredRepo `json:"repo"`
	Analysis *RepoAnalysis  `json:"analysis,omitempty"`
}

// ==================== TOPOLOGY ANALYSIS TYPES ====================

type TopologyModule struct {
	ID         string   `json:"id"`
	Name       string   `json:"name"`
	Path       string   `json:"path"`
	FileCount  int      `json:"fileCount"`
	Language   string   `json:"language"`
	DependsOn  []string `json:"dependsOn"`
	DependedBy []string `json:"dependedBy"`
	FanOut     int      `json:"fanOut"`
	FanIn      int      `json:"fanIn"`
}

type TopologyCluster struct {
	ID        string   `json:"id"`
	Name      string   `json:"name"`
	ModuleIDs []string `json:"moduleIds"`
	FileCount int      `json:"fileCount"`
	RiskIndex float64  `json:"riskIndex"`
	RiskLevel string   `json:"riskLevel"` // low, medium, high, critical
}

type TopologyEdge struct {
	Source string `json:"source"`
	Target string `json:"target"`
	Weight int    `json:"weight"`
}

type TopologyMetrics struct {
	SubDomainsTracked   int     `json:"subDomainsTracked"`
	RegionalRiskIndex   float64 `json:"regionalRiskIndex"`
	EntropyDensity      string  `json:"entropyDensity"`      // Low, Medium, High, Extreme
	CascadingDebtStatus string  `json:"cascadingDebtStatus"` // Active, Neutral, Inactive
	TotalModules        int     `json:"totalModules"`
	TotalEdges          int     `json:"totalEdges"`
}

// ==================== DOCUMENTATION DRIFT TYPES ====================

type DocDriftAnalysis struct {
	Available          bool     `json:"available"`
	Reason             string   `json:"reason,omitempty"`
	DocFiles           []string `json:"docFiles"`
	CodeFiles          []string `json:"codeFiles"`
	DocCommitCount     int      `json:"docCommitCount"`
	CodeCommitCount    int      `json:"codeCommitCount"`
	MixedCommitCount   int      `json:"mixedCommitCount"`
	DocChurn           int      `json:"docChurn"`
	CodeChurn          int      `json:"codeChurn"`
	DriftRatio         float64  `json:"driftRatio"`     // (Doc commits / Total commits)
	TemporalOffsetDays float64  `json:"temporalOffset"` // DaysDoc - DaysCode (avg)
	Classification     string   `json:"classification"` // "Documentation-leading", "Code-leading", "Aligned"
	Interpretation     string   `json:"interpretation"`
}

type TopologyAnalysis struct {
	Available       bool              `json:"available"`
	Reason          string            `json:"reason,omitempty"`
	ProjectFullName string            `json:"projectFullName,omitempty"`
	Modules         []TopologyModule  `json:"modules"`
	Clusters        []TopologyCluster `json:"clusters"`
	Edges           []TopologyEdge    `json:"edges"`
	Metrics         TopologyMetrics   `json:"metrics"`
}

type AppState struct {
	Connection      *GitHubConnection        `json:"connection"`
	DiscoveredRepos []DiscoveredRepo         `json:"discoveredRepos"`
	Analyses        map[string]*RepoAnalysis `json:"analyses"`
	SelectedProject string                   `json:"selectedProject"`
}

var (
	state       AppState
	stateLock   sync.RWMutex
	stateFile   = "state.json"
	githubToken string // In-memory only, never persisted
)

// ==================== GITHUB API CLIENT ====================

type GitHubClient struct {
	token      string
	httpClient *http.Client
}

func NewGitHubClient(token string) *GitHubClient {
	return &GitHubClient{
		token:      token,
		httpClient: &http.Client{Timeout: 30 * time.Second},
	}
}

func (c *GitHubClient) request(path string) ([]byte, int, error) {
	url := "https://api.github.com" + path
	req, err := http.NewRequest("GET", url, nil)
	if err != nil {
		return nil, 0, err
	}

	if c.token != "" {
		req.Header.Set("Authorization", "Bearer "+c.token)
	}
	req.Header.Set("Accept", "application/vnd.github.v3+json")
	req.Header.Set("User-Agent", "RiskSurface-App")

	log.Printf("[GitHub API] GET %s", path)

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return nil, 0, err
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, resp.StatusCode, err
	}

	log.Printf("[GitHub API] Response: %d (%d bytes)", resp.StatusCode, len(body))
	return body, resp.StatusCode, nil
}

func (c *GitHubClient) GetAuthenticatedUser() (*GitHubUser, error) {
	body, status, err := c.request("/user")
	if err != nil {
		return nil, err
	}
	if status != 200 {
		return nil, fmt.Errorf("authentication failed: %d", status)
	}

	var user GitHubUser
	if err := json.Unmarshal(body, &user); err != nil {
		return nil, err
	}
	return &user, nil
}

func (c *GitHubClient) ListUserRepos() ([]GitHubRepoListing, error) {
	var allRepos []GitHubRepoListing
	page := 1

	for {
		body, status, err := c.request(fmt.Sprintf("/user/repos?per_page=100&page=%d&sort=updated", page))
		if err != nil {
			return nil, err
		}
		if status != 200 {
			return nil, fmt.Errorf("failed to list repos: %d", status)
		}

		var repos []GitHubRepoListing
		if err := json.Unmarshal(body, &repos); err != nil {
			return nil, err
		}

		if len(repos) == 0 {
			break
		}

		allRepos = append(allRepos, repos...)
		page++

		if len(repos) < 100 {
			break
		}
	}

	return allRepos, nil
}

func (c *GitHubClient) GetRepository(owner, repo string) (*GitHubRepoListing, error) {
	body, status, err := c.request(fmt.Sprintf("/repos/%s/%s", owner, repo))
	if err != nil {
		return nil, err
	}
	if status != 200 {
		return nil, fmt.Errorf("repo not found: %d", status)
	}

	var repoData GitHubRepoListing
	if err := json.Unmarshal(body, &repoData); err != nil {
		return nil, err
	}
	return &repoData, nil
}

func (c *GitHubClient) GetCommits(owner, repo string, limit int) ([]GitHubCommit, error) {
	body, status, err := c.request(fmt.Sprintf("/repos/%s/%s/commits?per_page=%d", owner, repo, limit))
	if err != nil {
		return nil, err
	}
	if status != 200 {
		return nil, fmt.Errorf("failed to fetch commits: %d", status)
	}

	var commits []GitHubCommit
	if err := json.Unmarshal(body, &commits); err != nil {
		return nil, err
	}
	return commits, nil
}

func (c *GitHubClient) GetContributors(owner, repo string) ([]GitHubContributor, error) {
	body, status, err := c.request(fmt.Sprintf("/repos/%s/%s/contributors?per_page=100", owner, repo))
	if err != nil {
		return nil, err
	}
	if status != 200 {
		return nil, fmt.Errorf("failed to fetch contributors: %d", status)
	}

	var contributors []GitHubContributor
	if err := json.Unmarshal(body, &contributors); err != nil {
		return nil, err
	}
	return contributors, nil
}

func (c *GitHubClient) GetFileContent(owner, repo, path string) ([]byte, error) {
	body, status, err := c.request(fmt.Sprintf("/repos/%s/%s/contents/%s", owner, repo, path))
	if err != nil {
		return nil, err
	}
	if status == 404 {
		return nil, nil
	}
	if status != 200 {
		return nil, fmt.Errorf("failed to fetch file: %d", status)
	}

	var content GitHubContent
	if err := json.Unmarshal(body, &content); err != nil {
		return nil, err
	}

	if content.Encoding == "base64" {
		decoded, err := base64.StdEncoding.DecodeString(content.Content)
		if err != nil {
			return nil, err
		}
		return decoded, nil
	}
	return []byte(content.Content), nil
}

func (c *GitHubClient) GetFileTree(owner, repo, branch string) (*GitHubTreeResponse, error) {
	body, status, err := c.request(fmt.Sprintf("/repos/%s/%s/git/trees/%s?recursive=1", owner, repo, branch))
	if err != nil {
		return nil, err
	}
	if status != 200 {
		return nil, fmt.Errorf("failed to fetch tree: %d", status)
	}

	var tree GitHubTreeResponse
	if err := json.Unmarshal(body, &tree); err != nil {
		return nil, err
	}
	return &tree, nil
}

// GitHub Stats API - returns weekly commit counts for last 52 weeks
// Note: GitHub returns 202 when stats are being computed for the first time
func (c *GitHubClient) GetCommitActivity(owner, repo string) ([]CommitActivityWeek, error) {
	maxRetries := 3
	var body []byte
	var status int
	var err error

	for attempt := 0; attempt < maxRetries; attempt++ {
		body, status, err = c.request(fmt.Sprintf("/repos/%s/%s/stats/commit_activity", owner, repo))
		if err != nil {
			return nil, err
		}

		if status == 200 {
			break
		}

		// GitHub returns 202 when stats are being computed
		if status == 202 {
			log.Printf("[GitHub Stats] Commit activity is being computed (attempt %d/%d), waiting...", attempt+1, maxRetries)
			time.Sleep(3 * time.Second)
			continue
		}

		// Other error status
		return nil, fmt.Errorf("failed to fetch commit activity: %d", status)
	}

	if status != 200 {
		log.Printf("[GitHub Stats] Stats still not ready after %d attempts", maxRetries)
		return nil, fmt.Errorf("commit activity not ready (status %d) - try again later", status)
	}

	var activity []CommitActivityWeek
	if err := json.Unmarshal(body, &activity); err != nil {
		return nil, err
	}
	return activity, nil
}

// GitHub Stats API - returns weekly additions/deletions
func (c *GitHubClient) GetCodeFrequency(owner, repo string) ([]CodeFrequencyWeek, error) {
	maxRetries := 3
	var body []byte
	var status int
	var err error

	for attempt := 0; attempt < maxRetries; attempt++ {
		body, status, err = c.request(fmt.Sprintf("/repos/%s/%s/stats/code_frequency", owner, repo))
		if err != nil {
			return nil, err
		}

		if status == 200 {
			break
		}

		if status == 202 {
			log.Printf("[GitHub Stats] Code frequency is being computed (attempt %d/%d), waiting...", attempt+1, maxRetries)
			time.Sleep(3 * time.Second)
			continue
		}

		return nil, fmt.Errorf("failed to fetch code frequency: %d", status)
	}

	if status != 200 {
		log.Printf("[GitHub Stats] Code frequency still not ready after %d attempts", maxRetries)
		return []CodeFrequencyWeek{}, nil // Return empty, don't fail
	}

	// Returns array of [timestamp, additions, deletions]
	var raw [][]int
	if err := json.Unmarshal(body, &raw); err != nil {
		return nil, err
	}

	var result []CodeFrequencyWeek
	for _, week := range raw {
		if len(week) >= 3 {
			result = append(result, CodeFrequencyWeek{
				Week:      week[0],
				Additions: week[1],
				Deletions: week[2],
			})
		}
	}
	return result, nil
}

type GitHubCommitDetail struct {
	Files []struct {
		Filename string `json:"filename"`
	} `json:"files"`
}

func (c *GitHubClient) GetCommitFiles(owner, repo, sha string) ([]string, error) {
	body, status, err := c.request(fmt.Sprintf("/repos/%s/%s/commits/%s", owner, repo, sha))
	if err != nil {
		return nil, err
	}
	if status != 200 {
		return nil, fmt.Errorf("failed to fetch commit detail: %d", status)
	}

	var detail GitHubCommitDetail
	if err := json.Unmarshal(body, &detail); err != nil {
		return nil, err
	}

	files := make([]string, len(detail.Files))
	for i, f := range detail.Files {
		files[i] = f.Filename
	}
	return files, nil
}

// ==================== ANALYSIS ENGINE ====================

func analyzeRepository(client *GitHubClient, owner, repo, defaultBranch string) (*RepoAnalysis, error) {
	log.Printf("[Analysis] Starting analysis for %s/%s", owner, repo)

	repoData, err := client.GetRepository(owner, repo)
	if err != nil {
		return nil, err
	}

	commits, err := client.GetCommits(owner, repo, 100)
	if err != nil {
		log.Printf("[Analysis] Warning: Failed to fetch commits: %v", err)
		commits = []GitHubCommit{}
	}

	// Fetch yearly commit activity (daily stats for 52 weeks) for the heatmap
	activity, err := client.GetCommitActivity(owner, repo)
	if err != nil {
		log.Printf("[Analysis] Warning: Failed to fetch yearly activity: %v", err)
	}

	contributors, err := client.GetContributors(owner, repo)
	if err != nil {
		log.Printf("[Analysis] Warning: Failed to fetch contributors: %v", err)
		contributors = []GitHubContributor{}
	}

	branch := defaultBranch
	if branch == "" {
		branch = "main"
	}

	var fileCount, dirCount int
	filesByExt := make(map[string]int)
	dirFileCounts := make(map[string]int)

	tree, err := client.GetFileTree(owner, repo, branch)
	if err != nil {
		log.Printf("[Analysis] Warning: Failed to fetch tree: %v", err)
	} else {
		for _, node := range tree.Tree {
			switch node.Type {
			case "blob":
				fileCount++
				ext := ""
				if idx := strings.LastIndex(node.Path, "."); idx != -1 {
					ext = node.Path[idx:]
				}
				filesByExt[ext]++

				parts := strings.Split(node.Path, "/")
				if len(parts) > 1 {
					dirFileCounts[parts[0]]++
				}
			case "tree":
				dirCount++
			}
		}
	}

	var topDirs []DirectoryInfo
	for dir, count := range dirFileCounts {
		topDirs = append(topDirs, DirectoryInfo{Path: dir, FileCount: count})
	}
	sort.Slice(topDirs, func(i, j int) bool {
		return topDirs[i].FileCount > topDirs[j].FileCount
	})
	if len(topDirs) > 10 {
		topDirs = topDirs[:10]
	}

	var dependencies []DependencyDetail
	depCount := 0

	if content, err := client.GetFileContent(owner, repo, "package.json"); err == nil && content != nil {
		var pkg struct {
			Dependencies    map[string]string `json:"dependencies"`
			DevDependencies map[string]string `json:"devDependencies"`
		}
		if json.Unmarshal(content, &pkg) == nil {
			for name, version := range pkg.Dependencies {
				dependencies = append(dependencies, DependencyDetail{Name: name, Version: version, Type: "production"})
				depCount++
			}
			for name, version := range pkg.DevDependencies {
				dependencies = append(dependencies, DependencyDetail{Name: name, Version: version, Type: "development"})
				depCount++
			}
		}
	}

	if content, err := client.GetFileContent(owner, repo, "requirements.txt"); err == nil && content != nil {
		lines := strings.Split(string(content), "\n")
		for _, line := range lines {
			line = strings.TrimSpace(line)
			if line == "" || strings.HasPrefix(line, "#") {
				continue
			}
			re := regexp.MustCompile(`^([a-zA-Z0-9_-]+)([><=!]+)?(.*)$`)
			if matches := re.FindStringSubmatch(line); matches != nil {
				dependencies = append(dependencies, DependencyDetail{
					Name:    matches[1],
					Version: strings.TrimSpace(matches[3]),
					Type:    "production",
				})
				depCount++
			}
		}
	}

	if content, err := client.GetFileContent(owner, repo, "go.mod"); err == nil && content != nil {
		lines := strings.Split(string(content), "\n")
		inRequire := false
		for _, line := range lines {
			line = strings.TrimSpace(line)
			if strings.HasPrefix(line, "require (") {
				inRequire = true
				continue
			}
			if line == ")" {
				inRequire = false
				continue
			}
			if inRequire || strings.HasPrefix(line, "require ") {
				parts := strings.Fields(strings.TrimPrefix(line, "require "))
				if len(parts) >= 2 {
					dependencies = append(dependencies, DependencyDetail{
						Name:    parts[0],
						Version: parts[1],
						Type:    "production",
					})
					depCount++
				}
			}
		}
	}

	commitTimeline := make(map[string]int)
	now := time.Now()
	thirtyDaysAgo := now.AddDate(0, 0, -30)
	commitsLast30 := 0

	var recentCommits []CommitSummary
	for i, c := range commits {
		dateStr := c.Commit.Author.Date.Format("2006-01-02")
		commitTimeline[dateStr]++

		if c.Commit.Author.Date.After(thirtyDaysAgo) {
			commitsLast30++
		}

		if i < 10 {
			message := c.Commit.Message
			if len(message) > 80 {
				message = message[:80] + "..."
			}

			// Intent classification for recent commits
			// We try to get files for the most recent to be more accurate
			files, _ := client.GetCommitFiles(owner, repo, c.SHA)
			intent, conf, signal := classifyCommitIntent(c.Commit.Message, files)

			recentCommits = append(recentCommits, CommitSummary{
				SHA:              c.SHA[:7],
				Message:          message,
				Author:           c.Commit.Author.Name,
				Date:             c.Commit.Author.Date,
				Intent:           intent,
				Confidence:       conf,
				TriggeringSignal: signal,
			})
		}
	}

	var timelineSlice []CommitTimelinePoint
	for date, count := range commitTimeline {
		timelineSlice = append(timelineSlice, CommitTimelinePoint{Date: date, Count: count})
	}
	sort.Slice(timelineSlice, func(i, j int) bool {
		return timelineSlice[i].Date < timelineSlice[j].Date
	})

	repoAge := int(now.Sub(repoData.UpdatedAt).Hours() / 24 / 30)
	daysSincePush := int(now.Sub(repoData.PushedAt).Hours() / 24)

	activityScore := float64(commitsLast30) / 10.0
	if activityScore > 10 {
		activityScore = 10
	}

	stalenessScore := float64(daysSincePush) / 30.0

	teamRiskScore := 1.0
	if len(contributors) > 0 {
		teamRiskScore = 1.0 / float64(len(contributors))
	}

	trend := "stable"
	if commitsLast30 > 10 {
		trend = "active"
	} else if commitsLast30 < 3 {
		trend = "declining"
	}

	analysis := &RepoAnalysis{
		FetchedAt:         now,
		RepoAgeMonths:     repoAge,
		DaysSinceLastPush: daysSincePush,
		TotalCommits:      len(commits),
		CommitsLast30Days: commitsLast30,
		CommitsTrend:      trend,
		ContributorCount:  len(contributors),
		DependencyCount:   depCount,
		FileCount:         fileCount,
		DirectoryCount:    dirCount,
		TopDirectories:    topDirs,
		Dependencies:      dependencies,
		RecentCommits:     recentCommits,
		CommitTimeline:    timelineSlice,
		CommitActivity:    activity,
		FilesByExtension:  filesByExt,
		ActivityScore:     activityScore,
		StalenessScore:    stalenessScore,
		TeamRiskScore:     teamRiskScore,
	}

	// Compute Risk Trajectory from real GitHub stats
	trajectory := analyzeTrajectory(client, owner, repo)
	analysis.Trajectory = trajectory

	topology := analyzeTopology(tree)
	impact := analyzeImpact(topology, tree)
	analysis.Impact = impact

	// Compute Change Concentration from commit diffs
	concentration := analyzeConcentration(client, owner, repo)
	analysis.Concentration = concentration

	// Compute Real Dependency Graph from import statements
	deps := analyzeDependencies(client, owner, repo, tree, concentration)
	analysis.Deps = deps

	// Compute Temporal Hotspots from commit timestamps and diffs
	temporal := analyzeTemporal(client, owner, repo)
	analysis.Temporal = temporal

	// Bus Factor Deepening - Joins authorship with criticality
	busFactor := analyzeBusFactor(client, owner, repo, deps, concentration)
	analysis.BusFactor = busFactor

	// Embed into concentration for frontend consumption in Team View
	if concentration != nil {
		concentration.OwnershipRisk = busFactor
	}

	// Documentation Drift Analysis
	docDrift := analyzeDocDrift(client, owner, repo)
	analysis.DocDrift = docDrift

	// Commit Intent Classification
	intentAnalysis := analyzeCommitIntents(client, owner, repo, commits)
	analysis.IntentAnalysis = intentAnalysis

	// Structural Depth Analysis
	structuralDepth := analyzeStructuralDepth(tree.Tree)
	analysis.StructuralDepth = structuralDepth

	// Activity Volatility Analysis
	volatility := analyzeActivityVolatility(commits)
	analysis.Volatility = volatility

	// Test Surface Ratio Analysis
	testSurface := analyzeTestSurface(tree.Tree, dependencies)
	analysis.TestSurface = testSurface

	// Privacy & Security Signal Consistency Check
	securityAnalysis := analyzeSecurityConsistency(client, owner, repo, tree.Tree, dependencies)
	analysis.SecurityAnalysis = securityAnalysis

	log.Printf("[Analysis] Complete: %d files, %d commits, %d deps", fileCount, len(commits), depCount)
	return analysis, nil
}

// ==================== RISK TRAJECTORY ANALYSIS ====================

// analyzeTrajectory computes risk trajectory from real GitHub stats API
// Returns weekly snapshots of risk scores computed from commit activity and code churn
func analyzeTrajectory(client *GitHubClient, owner, repo string) *TrajectoryAnalysis {
	log.Printf("[Trajectory] Starting trajectory analysis for %s/%s", owner, repo)

	// Fetch commit activity (weekly commits for 52 weeks)
	commitActivity, err := client.GetCommitActivity(owner, repo)
	if err != nil {
		log.Printf("[Trajectory] Warning: Failed to fetch commit activity: %v", err)
		return &TrajectoryAnalysis{
			Available: false,
			Reason:    "Failed to fetch commit activity",
			Snapshots: make([]TrajectorySnapshot, 0),
		}
	}

	// Fetch code frequency (weekly additions/deletions)
	codeFrequency, err := client.GetCodeFrequency(owner, repo)
	if err != nil {
		log.Printf("[Trajectory] Warning: Failed to fetch code frequency: %v", err)
		// Continue without code frequency data
		codeFrequency = []CodeFrequencyWeek{}
	}

	if len(commitActivity) == 0 {
		return &TrajectoryAnalysis{
			Available: false,
			Reason:    "No commit history available",
			Snapshots: make([]TrajectorySnapshot, 0),
		}
	}

	// Create code frequency lookup by week timestamp
	codeFreqMap := make(map[int64]CodeFrequencyWeek)
	for _, cf := range codeFrequency {
		codeFreqMap[int64(cf.Week)] = cf
	}

	// Calculate baseline metrics
	totalCommits := 0
	totalChurn := 0
	activeWeeks := 0
	for _, week := range commitActivity {
		totalCommits += week.Total
		if week.Total > 0 {
			activeWeeks++
		}
		if cf, ok := codeFreqMap[week.Week]; ok {
			totalChurn += abs(cf.Additions) + abs(cf.Deletions)
		}
	}

	if activeWeeks == 0 {
		return &TrajectoryAnalysis{
			Available: false,
			Reason:    "No active weeks in history",
			Snapshots: make([]TrajectorySnapshot, 0),
		}
	}

	avgCommitsPerWeek := float64(totalCommits) / float64(len(commitActivity))
	avgChurnPerWeek := float64(totalChurn) / float64(len(commitActivity))
	if avgChurnPerWeek == 0 {
		avgChurnPerWeek = 1 // Prevent division by zero
	}

	// Build trajectory snapshots
	snapshots := make([]TrajectorySnapshot, 0)
	var previousRisk float64
	peakRiskScore := 0.0
	peakRiskWeek := ""

	for _, week := range commitActivity {
		weekTime := time.Unix(week.Week, 0)
		weekStart := weekTime.Format("2006-01-02")
		_, weekNum := weekTime.ISOWeek()
		dateLabel := fmt.Sprintf("%d-W%02d", weekTime.Year(), weekNum)

		// Get code frequency for this week
		additions := 0
		deletions := 0
		if cf, ok := codeFreqMap[week.Week]; ok {
			additions = abs(cf.Additions)
			deletions = abs(cf.Deletions)
		}

		churnScore := float64(additions + deletions)

		// Compute risk score:
		// Risk = BaseRisk + (ChurnFactor * VelocityFactor)
		// ChurnFactor = churn / avgChurn
		// VelocityFactor = commits / avgCommits
		velocityFactor := 1.0
		if avgCommitsPerWeek > 0 {
			velocityFactor = float64(week.Total) / avgCommitsPerWeek
		}
		churnFactor := 1.0
		if avgChurnPerWeek > 0 {
			churnFactor = churnScore / avgChurnPerWeek
		}

		baseRisk := 25.0 // Baseline risk
		riskScore := baseRisk + (churnFactor * 15) + (velocityFactor * 10)
		if riskScore > 100 {
			riskScore = 100
		}

		// Calculate delta from previous week
		riskDelta := riskScore - previousRisk
		previousRisk = riskScore

		// Track peak risk
		if riskScore > peakRiskScore {
			peakRiskScore = riskScore
			peakRiskWeek = dateLabel
		}

		snapshots = append(snapshots, TrajectorySnapshot{
			Date:        dateLabel,
			WeekStart:   weekStart,
			CommitCount: week.Total,
			Additions:   additions,
			Deletions:   deletions,
			ChurnScore:  churnScore,
			RiskScore:   riskScore,
			RiskDelta:   riskDelta,
		})
	}

	// Calculate velocity trend (comparing recent 4 weeks to previous 4 weeks)
	velocityTrend := "stable"
	velocityFactor := 1.0
	if len(snapshots) >= 8 {
		recent4 := snapshots[len(snapshots)-4:]
		previous4 := snapshots[len(snapshots)-8 : len(snapshots)-4]

		recentCommits := 0
		previousCommits := 0
		for _, s := range recent4 {
			recentCommits += s.CommitCount
		}
		for _, s := range previous4 {
			previousCommits += s.CommitCount
		}

		if previousCommits > 0 {
			velocityFactor = float64(recentCommits) / float64(previousCommits)
			if velocityFactor > 1.2 {
				velocityTrend = "accelerating"
			} else if velocityFactor < 0.8 {
				velocityTrend = "decelerating"
			}
		}
	}

	// Calculate overall risk trend
	overallTrend := "stable"
	if len(snapshots) >= 4 {
		recent := snapshots[len(snapshots)-4:]
		avgRecentRisk := 0.0
		for _, s := range recent {
			avgRecentRisk += s.RiskScore
		}
		avgRecentRisk /= 4

		older := snapshots[:4]
		avgOlderRisk := 0.0
		for _, s := range older {
			avgOlderRisk += s.RiskScore
		}
		avgOlderRisk /= 4

		if avgRecentRisk > avgOlderRisk*1.1 {
			overallTrend = "increasing_risk"
		} else if avgRecentRisk < avgOlderRisk*0.9 {
			overallTrend = "decreasing_risk"
		}
	}

	// Determine confidence level
	confidence := "low"
	if len(snapshots) >= 12 {
		confidence = "medium"
	}
	if len(snapshots) >= 26 && activeWeeks >= 10 {
		confidence = "high"
	}

	log.Printf("[Trajectory] Complete: %d weeks, velocity=%.2fx, trend=%s", len(snapshots), velocityFactor, overallTrend)

	return &TrajectoryAnalysis{
		Available:       true,
		Snapshots:       snapshots,
		VelocityTrend:   velocityTrend,
		VelocityFactor:  velocityFactor,
		OverallTrend:    overallTrend,
		ConfidenceLevel: confidence,
		TotalWeeks:      len(snapshots),
		PeakRiskWeek:    peakRiskWeek,
		PeakRiskScore:   peakRiskScore,
	}
}

// abs returns absolute value of int
func abs(x int) int {
	if x < 0 {
		return -x
	}
	return x
}

// ==================== IMPACT & EXPOSURE ANALYSIS ====================

// analyzeImpact computes impact propagation from topology data
// All fragility, blast radius, and exposure values are derived from real structure
func analyzeImpact(topology *TopologyAnalysis, tree *GitHubTreeResponse) *ImpactAnalysis {
	log.Printf("[Impact] Starting impact analysis")

	if topology == nil || !topology.Available || len(topology.Modules) == 0 {
		return &ImpactAnalysis{
			Available:   false,
			Reason:      "Topology data unavailable",
			ImpactUnits: make([]ImpactUnit, 0),
		}
	}

	// Build adjacency maps from edges
	// fanIn: who depends on me (dependents)
	// fanOut: who I depend on (dependencies)
	fanIn := make(map[string]int)
	fanOut := make(map[string]int)
	dependents := make(map[string][]string)   // module -> list of modules that depend on it
	dependencies := make(map[string][]string) // module -> list of modules it depends on

	for _, edge := range topology.Edges {
		fanOut[edge.Source]++
		fanIn[edge.Target]++
		dependents[edge.Target] = append(dependents[edge.Target], edge.Source)
		dependencies[edge.Source] = append(dependencies[edge.Source], edge.Target)
	}

	// Build file paths map for each module
	modulePaths := make(map[string][]string)
	if tree != nil {
		for _, node := range tree.Tree {
			if node.Type == "blob" {
				parts := strings.Split(node.Path, "/")
				if len(parts) > 0 {
					moduleName := parts[0]
					// Handle root files
					if len(parts) == 1 {
						moduleName = "(root)"
					}
					modulePaths[moduleName] = append(modulePaths[moduleName], node.Path)
				}
			}
		}
	}

	// Calculate max values for normalization
	maxFanIn := 1
	maxFanOut := 1
	maxFiles := 1
	for _, m := range topology.Modules {
		if fanIn[m.Name] > maxFanIn {
			maxFanIn = fanIn[m.Name]
		}
		if fanOut[m.Name] > maxFanOut {
			maxFanOut = fanOut[m.Name]
		}
		if m.FileCount > maxFiles {
			maxFiles = m.FileCount
		}
	}

	// Detect cyclic dependencies (simplified: check if A->B and B->A exist)
	cyclic := make(map[string]bool)
	for _, edge := range topology.Edges {
		for _, dep := range dependencies[edge.Target] {
			if dep == edge.Source {
				cyclic[edge.Source] = true
				cyclic[edge.Target] = true
			}
		}
	}

	// Compute blast radius via BFS (transitive dependents)
	computeBlastRadius := func(moduleName string) int {
		visited := make(map[string]bool)
		queue := []string{moduleName}
		visited[moduleName] = true
		count := 0

		for len(queue) > 0 {
			current := queue[0]
			queue = queue[1:]
			for _, dep := range dependents[current] {
				if !visited[dep] {
					visited[dep] = true
					queue = append(queue, dep)
					count++
				}
			}
		}
		return count
	}

	// Build impact units
	impactUnits := make([]ImpactUnit, 0, len(topology.Modules))
	totalModules := len(topology.Modules)

	var mostFragile string
	var largestBlast string
	maxFragility := 0.0
	maxBlastRadius := 0

	criticalCount := 0
	highCount := 0
	mediumCount := 0
	lowCount := 0

	for _, module := range topology.Modules {
		fIn := fanIn[module.Name]
		fOut := fanOut[module.Name]
		isCyclic := cyclic[module.Name]
		blastRadius := computeBlastRadius(module.Name)
		filePaths := modulePaths[module.Name]
		if filePaths == nil {
			filePaths = make([]string, 0)
		}

		// Fragility formula:
		// (fanIn/maxFanIn * 0.25) + (fanOut/maxFanOut * 0.25) + (cyclic * 0.2) + (fileCount/maxFiles * 0.3)
		fanInNorm := float64(fIn) / float64(maxFanIn)
		fanOutNorm := float64(fOut) / float64(maxFanOut)
		fileNorm := float64(module.FileCount) / float64(maxFiles)
		cyclicPenalty := 0.0
		if isCyclic {
			cyclicPenalty = 0.2
		}

		fragility := (fanInNorm*0.25 + fanOutNorm*0.25 + cyclicPenalty + fileNorm*0.3) * 100
		if fragility > 100 {
			fragility = 100
		}

		// Exposure scope classification
		var exposureScope string
		dependentRatio := float64(fIn) / float64(totalModules)
		if dependentRatio > 0.5 {
			exposureScope = "system-wide"
		} else if fIn > fOut && fIn > 2 {
			exposureScope = "transactional"
		} else if fOut > fIn {
			exposureScope = "downstream"
		} else {
			exposureScope = "external"
		}

		// Trend based on computed fragility (not historical - would need trajectory data)
		trend := "stabilizing"
		if fragility > 70 {
			trend = "accelerating"
		} else if fragility < 30 {
			trend = "improving"
		}

		unit := ImpactUnit{
			Name:           module.Name,
			FilePaths:      filePaths,
			FileCount:      module.FileCount,
			FragilityScore: fragility,
			ExposureScope:  exposureScope,
			BlastRadius:    blastRadius,
			Trend:          trend,
			FanIn:          fIn,
			FanOut:         fOut,
			IsCyclic:       isCyclic,
		}

		impactUnits = append(impactUnits, unit)

		// Track max fragility
		if fragility > maxFragility {
			maxFragility = fragility
			mostFragile = module.Name
		}

		// Track max blast radius
		if blastRadius > maxBlastRadius {
			maxBlastRadius = blastRadius
			largestBlast = module.Name
		}

		// Count by severity
		if fragility >= 75 {
			criticalCount++
		} else if fragility >= 50 {
			highCount++
		} else if fragility >= 25 {
			mediumCount++
		} else {
			lowCount++
		}
	}

	// Sort by fragility descending
	sort.Slice(impactUnits, func(i, j int) bool {
		return impactUnits[i].FragilityScore > impactUnits[j].FragilityScore
	})

	log.Printf("[Impact] Complete: %d units, critical=%d, high=%d", len(impactUnits), criticalCount, highCount)

	return &ImpactAnalysis{
		Available:     true,
		ImpactUnits:   impactUnits,
		TotalModules:  totalModules,
		CriticalCount: criticalCount,
		HighCount:     highCount,
		MediumCount:   mediumCount,
		LowCount:      lowCount,
		MostFragile:   mostFragile,
		LargestBlast:  largestBlast,
	}
}

// ==================== REAL DEPENDENCY GRAPH ANALYSIS ====================

// analyzeDependencies extracts REAL import statements and enriches them with risk profiles
func analyzeDependencies(client *GitHubClient, owner, repo string, tree *GitHubTreeResponse, concentration *ConcentrationAnalysis) *DependencyAnalysis {
	log.Printf("[Deps] Starting enriched dependency risk profile analysis")

	if tree == nil || len(tree.Tree) == 0 {
		return &DependencyAnalysis{Available: false, Reason: "No file tree available"}
	}

	// 1. Parse Manifests for versions
	manifestVersions := parseManifests(client, owner, repo, tree)

	// 2. Identify Manifest Touches for Volatility (from concentration if available)
	volatilityMap := make(map[string]float64)
	if concentration != nil && concentration.Available {
		for _, hs := range concentration.Hotspots {
			volatilityMap[hs.Path] = hs.Percent / 100.0
		}
	}

	// Regex patterns
	pyImportRe := regexp.MustCompile(`(?m)^(?:from\s+([a-zA-Z0-9_.]+)\s+import|import\s+([a-zA-Z0-9_.]+))`)
	jsImportRe := regexp.MustCompile(`(?m)(?:import\s+.*?\s+from\s+['"]([^'"]+)['"]|require\s*\(\s*['"]([^'"]+)['"]\s*\))`)
	goImportRe := regexp.MustCompile(`(?m)import\s+(?:\(\s*)?["']?([^"'\s\)]+)["']?`)

	sourceFiles := make([]GitHubTreeNode, 0)
	for _, node := range tree.Tree {
		if node.Type != "blob" {
			continue
		}
		ext := strings.ToLower(filepath.Ext(node.Path))
		if ext == ".py" || ext == ".js" || ext == ".ts" || ext == ".jsx" || ext == ".tsx" || ext == ".go" {
			sourceFiles = append(sourceFiles, node)
		}
	}

	if len(sourceFiles) == 0 {
		return &DependencyAnalysis{Available: false, Reason: "No source files"}
	}

	// Limit processing for rate limits
	sort.Slice(sourceFiles, func(i, j int) bool { return sourceFiles[i].Size > sourceFiles[j].Size })
	limit := len(sourceFiles)
	if limit > 25 {
		limit = 25
	}
	sourceFiles = sourceFiles[:limit]

	nodes := make(map[string]*DependencyNode)
	edges := make([]DependencyEdge, 0)
	fanIn := make(map[string]int)
	fanOut := make(map[string]int)

	// Pre-populate nodes for all files in tree to detect internal deps
	fileSet := make(map[string]bool)
	for _, node := range tree.Tree {
		if node.Type == "blob" {
			fileSet[node.Path] = true
		}
	}

	// Process imports
	for _, file := range sourceFiles {
		content, err := client.GetFileContent(owner, repo, file.Path)
		if err != nil {
			continue
		}

		contentStr := string(content)
		ext := strings.ToLower(filepath.Ext(file.Path))

		var matches [][]string
		switch ext {
		case ".py":
			matches = pyImportRe.FindAllStringSubmatch(contentStr, -1)
		case ".js", ".jsx", ".ts", ".tsx":
			matches = jsImportRe.FindAllStringSubmatch(contentStr, -1)
		case ".go":
			matches = goImportRe.FindAllStringSubmatch(contentStr, -1)
		}

		for _, match := range matches {
			imp := ""
			for i := 1; i < len(match); i++ {
				if match[i] != "" {
					imp = match[i]
					break
				}
			}
			if imp == "" {
				continue
			}
			imp = strings.Trim(imp, `"' `)

			// Simple check for internal vs external
			category := "external"
			// Check if it looks like a local path (starts with . or matches a file in tree)
			if strings.HasPrefix(imp, ".") || fileSet[imp] || fileSet[imp+ext] {
				category = "internal"
			}

			// Skip systemic noise
			if category == "external" && (strings.HasPrefix(imp, "react") || strings.HasPrefix(imp, "os") || strings.HasPrefix(imp, "sys")) {
				continue
			}

			if _, exists := nodes[file.Path]; !exists {
				nodes[file.Path] = &DependencyNode{
					ID:       file.Path,
					Name:     filepath.Base(file.Path),
					Language: strings.TrimPrefix(ext, "."),
					Category: "internal",
				}
			}

			if _, exists := nodes[imp]; !exists {
				nodes[imp] = &DependencyNode{
					ID:       imp,
					Name:     filepath.Base(imp),
					Language: "unknown",
					Category: category,
					Version:  manifestVersions[imp],
				}
				if category == "external" {
					nodes[imp].Language = "package"
				}
			}

			edges = append(edges, DependencyEdge{
				Source:     file.Path,
				Target:     imp,
				ImportLine: strings.TrimSpace(match[0]),
			})
			fanOut[file.Path]++
			fanIn[imp]++
		}
	}

	// Metrics Calculation
	nodeList := make([]DependencyNode, 0, len(nodes))
	maxFanIn := 1
	for _, f := range fanIn {
		if f > maxFanIn {
			maxFanIn = f
		}
	}

	for id, node := range nodes {
		node.FanIn = fanIn[id]
		node.FanOut = fanOut[id]

		// Centrality: simplified as FanIn normalized
		node.Centrality = float64(node.FanIn) / float64(maxFanIn)

		// Volatility: from manifest or file churn
		node.Volatility = volatilityMap[id]

		// Version Health: Fetch latest from registry and compare
		if node.Category == "external" && node.Version != "" {
			// Determine the language for registry lookup
			regLang := "npm" // default for package type
			if node.Language == "py" || node.Language == "python" {
				regLang = "python"
			} else if node.Language == "go" {
				regLang = "go"
			}

			// Fetch latest version from registry (limited to external packages)
			latest := fetchLatestVersion(node.Name, regLang)
			node.LatestVersion = latest
			node.Lag = compareVersions(node.Version, latest)
		} else {
			node.Lag = "n/a" // Internal modules don't have version lag
		}

		// Risk Amplification = Centrality(40%) + Volatility(40%) + Lag(20%)
		var lagScore float64
		switch node.Lag {
		case "major-lag":
			lagScore = 1.0
		case "minor-lag":
			lagScore = 0.5
		case "unknown":
			lagScore = 0.3
		default:
			lagScore = 0.0
		}

		node.RiskAmplification = (node.Centrality*0.4 + node.Volatility*0.4 + lagScore*0.2) * 100
		node.RiskScore = node.RiskAmplification // Sync for backward compat

		nodeList = append(nodeList, *node)
	}

	return &DependencyAnalysis{
		Available:  len(nodeList) > 0,
		Nodes:      nodeList,
		Edges:      edges,
		TotalNodes: len(nodeList),
		TotalEdges: len(edges),
		MaxFanIn:   maxFanIn,
	}
}

func parseManifests(client *GitHubClient, owner, repo string, tree *GitHubTreeResponse) map[string]string {
	versions := make(map[string]string)
	for _, node := range tree.Tree {
		name := strings.ToLower(filepath.Base(node.Path))
		if name == "requirements.txt" {
			content, _ := client.GetFileContent(owner, repo, node.Path)
			lines := strings.Split(string(content), "\n")
			for _, line := range lines {
				line = strings.TrimSpace(line)
				if line == "" || strings.HasPrefix(line, "#") {
					continue
				}
				// Handle ==, >=, ~=, <=
				for _, sep := range []string{"==", ">=", "~=", "<="} {
					parts := strings.SplitN(line, sep, 2)
					if len(parts) == 2 {
						versions[strings.TrimSpace(parts[0])] = strings.TrimSpace(parts[1])
						break
					}
				}
			}
		} else if name == "package.json" {
			content, _ := client.GetFileContent(owner, repo, node.Path)
			var pkg struct {
				Deps    map[string]string `json:"dependencies"`
				DevDeps map[string]string `json:"devDependencies"`
			}
			if err := json.Unmarshal(content, &pkg); err == nil {
				for k, v := range pkg.Deps {
					versions[k] = v
				}
				for k, v := range pkg.DevDeps {
					versions[k] = v
				}
			}
		} else if name == "go.mod" {
			content, _ := client.GetFileContent(owner, repo, node.Path)
			lines := strings.Split(string(content), "\n")
			inRequire := false
			for _, line := range lines {
				line = strings.TrimSpace(line)
				if strings.HasPrefix(line, "require (") || strings.HasPrefix(line, "require(") {
					inRequire = true
					continue
				}
				if inRequire && line == ")" {
					inRequire = false
					continue
				}
				if inRequire && line != "" && !strings.HasPrefix(line, "//") {
					// Format: module/path vX.Y.Z
					parts := strings.Fields(line)
					if len(parts) >= 2 {
						mod := parts[0]
						ver := parts[1]
						// Extract short name for easier matching
						shortName := filepath.Base(mod)
						versions[mod] = ver
						versions[shortName] = ver
					}
				}
				// Single-line require
				if strings.HasPrefix(line, "require ") && !strings.Contains(line, "(") {
					parts := strings.Fields(line)
					if len(parts) >= 3 {
						mod := parts[1]
						ver := parts[2]
						shortName := filepath.Base(mod)
						versions[mod] = ver
						versions[shortName] = ver
					}
				}
			}
		}
	}
	return versions
}

// fetchLatestVersion queries package registries for the latest available version
// Returns the latest version string or empty if unavailable
func fetchLatestVersion(pkgName, language string) string {
	client := &http.Client{Timeout: 3 * time.Second}
	var url string

	switch language {
	case "npm", "javascript", "typescript", "js", "ts", "jsx", "tsx":
		// npm registry
		url = fmt.Sprintf("https://registry.npmjs.org/%s", pkgName)
	case "python", "py":
		// PyPI registry
		url = fmt.Sprintf("https://pypi.org/pypi/%s/json", pkgName)
	case "go":
		// Go proxy (returns plain text for @latest)
		url = fmt.Sprintf("https://proxy.golang.org/%s/@latest", pkgName)
	default:
		return ""
	}

	resp, err := client.Get(url)
	if err != nil || resp.StatusCode != http.StatusOK {
		return ""
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return ""
	}

	switch language {
	case "npm", "javascript", "typescript", "js", "ts", "jsx", "tsx":
		var npmResp struct {
			DistTags struct {
				Latest string `json:"latest"`
			} `json:"dist-tags"`
		}
		if err := json.Unmarshal(body, &npmResp); err == nil {
			return npmResp.DistTags.Latest
		}
	case "python", "py":
		var pypiResp struct {
			Info struct {
				Version string `json:"version"`
			} `json:"info"`
		}
		if err := json.Unmarshal(body, &pypiResp); err == nil {
			return pypiResp.Info.Version
		}
	case "go":
		var goResp struct {
			Version string `json:"Version"`
		}
		if err := json.Unmarshal(body, &goResp); err == nil {
			return goResp.Version
		}
	}

	return ""
}

// compareVersions determines the lag status between declared and latest versions
func compareVersions(declared, latest string) string {
	if declared == "" || latest == "" {
		return "unknown"
	}

	// Clean version strings
	declared = strings.TrimPrefix(declared, "^")
	declared = strings.TrimPrefix(declared, "~")
	declared = strings.TrimPrefix(declared, "v")
	latest = strings.TrimPrefix(latest, "v")

	if declared == latest {
		return "up-to-date"
	}

	// Parse major.minor.patch
	declParts := strings.Split(declared, ".")
	lateParts := strings.Split(latest, ".")

	if len(declParts) == 0 || len(lateParts) == 0 {
		return "unknown"
	}

	// Compare major version
	var declMajor, lateMajor int
	fmt.Sscanf(declParts[0], "%d", &declMajor)
	fmt.Sscanf(lateParts[0], "%d", &lateMajor)

	if lateMajor > declMajor {
		return "major-lag"
	}

	// Compare minor version
	if len(declParts) > 1 && len(lateParts) > 1 {
		var declMinor, lateMinor int
		fmt.Sscanf(declParts[1], "%d", &declMinor)
		fmt.Sscanf(lateParts[1], "%d", &lateMinor)
		if lateMinor > declMinor {
			return "minor-lag"
		}
	}

	return "up-to-date"
}

// ==================== CHANGE CONCENTRATION ANALYSIS ====================

// analyzeConcentration extracts REAL commit diffs to identify high-churn hotspots
func analyzeConcentration(client *GitHubClient, owner, repo string) *ConcentrationAnalysis {
	log.Printf("[Concentration] Starting churn extraction for %s/%s", owner, repo)

	// Fetch last 50 commits to avoid extreme rate limiting
	commits, err := client.GetCommits(owner, repo, 50)
	if err != nil {
		return &ConcentrationAnalysis{Available: false, Reason: fmt.Sprintf("Failed to fetch commits: %v", err)}
	}

	if len(commits) == 0 {
		return &ConcentrationAnalysis{Available: false, Reason: "No commits found"}
	}

	churnMap := make(map[string]int)
	totalCommitsAnalyzed := 0

	// Fetch files for each commit - limit strictly to stay within aggressive rate limits
	limit := len(commits)
	if limit > 20 {
		limit = 20
	}

	for i := 0; i < limit; i++ {
		sha := commits[i].SHA
		files, err := client.GetCommitFiles(owner, repo, sha)
		if err != nil {
			log.Printf("[Concentration] Warning: Failed to fetch files for commit %s: %v", sha, err)
			continue
		}

		for _, file := range files {
			churnMap[file]++
		}
		totalCommitsAnalyzed++
	}

	if len(churnMap) == 0 {
		return &ConcentrationAnalysis{Available: false, Reason: "No file changes discovered in analyzed window"}
	}

	// Convert to slice for sorting
	type fileChurn struct {
		path  string
		count int
	}
	churnList := make([]fileChurn, 0, len(churnMap))
	totalFileChanges := 0
	for path, count := range churnMap {
		churnList = append(churnList, fileChurn{path, count})
		totalFileChanges += count
	}

	// Sort by count descending
	sort.Slice(churnList, func(i, j int) bool {
		return churnList[i].count > churnList[j].count
	})

	// Identify hotspots (Top files)
	topCount := 10
	if topCount > len(churnList) {
		topCount = len(churnList)
	}

	topCommitsSum := 0
	hotspots := make([]ChurnFile, 0, topCount)
	for i := 0; i < topCount; i++ {
		percent := (float64(churnList[i].count) / float64(totalFileChanges)) * 100
		hotspots = append(hotspots, ChurnFile{
			Path:        churnList[i].path,
			CommitCount: churnList[i].count,
			Percent:     percent,
		})
		topCommitsSum += churnList[i].count
	}

	// Concentration Index = percentage of changes in the top 10% (or top 3 if codebase is small)
	calcLimit := len(churnList) / 10
	if calcLimit < 1 {
		calcLimit = 1
	}
	calcSum := 0
	for i := 0; i < calcLimit && i < len(churnList); i++ {
		calcSum += churnList[i].count
	}
	concentrationIndex := (float64(calcSum) / float64(totalFileChanges)) * 100

	log.Printf("[Concentration] Complete: Index=%.2f%%, Hotspots=%d", concentrationIndex, len(hotspots))

	return &ConcentrationAnalysis{
		Available:            true,
		Window:               "Last 20 Commits",
		TotalCommitsAnalyzed: totalCommitsAnalyzed,
		TotalFilesTouched:    len(churnList),
		ConcentrationIndex:   concentrationIndex,
		Hotspots:             hotspots,
	}
}

// ==================== TEMPORAL HOTSPOT ANALYSIS ====================

func analyzeTemporal(client *GitHubClient, owner, repo string) *TemporalAnalysis {
	log.Printf("[Temporal] Analyzing commit series for %s/%s", owner, repo)

	// Fetch last 50 commits
	commits, err := client.GetCommits(owner, repo, 50)
	if err != nil {
		return &TemporalAnalysis{Available: false, Reason: fmt.Sprintf("Failed to fetch commits: %v", err)}
	}

	if len(commits) == 0 {
		return &TemporalAnalysis{Available: false, Reason: "No commits found"}
	}

	fileTimestamps := make(map[string][]time.Time)

	// Fetch files for each commit - limit strictly to stay within aggressive rate limits
	limit := len(commits)
	if limit > 20 {
		limit = 20
	}

	for i := 0; i < limit; i++ {
		sha := commits[i].SHA
		timestamp := commits[i].Commit.Author.Date
		files, err := client.GetCommitFiles(owner, repo, sha)
		if err != nil {
			continue
		}

		for _, file := range files {
			fileTimestamps[file] = append(fileTimestamps[file], timestamp)
		}
	}

	if len(fileTimestamps) == 0 {
		return &TemporalAnalysis{Available: false, Reason: "Insufficient diff data"}
	}

	var hotspots []TemporalHotspot
	totalFiles := 0
	totalCommitsInWindow := 0

	for _, ts := range fileTimestamps {
		totalFiles++
		totalCommitsInWindow += len(ts)
	}

	medianFrequency := float64(totalCommitsInWindow) / float64(totalFiles)

	for path, ts := range fileTimestamps {
		if len(ts) < 2 {
			continue // Need at least 2 points for temporal analysis
		}

		// Sort chronological
		sort.Slice(ts, func(i, j int) bool {
			return ts[i].Before(ts[j])
		})

		shortestInterval := 999999.0
		totalInterval := 0.0
		for i := 1; i < len(ts); i++ {
			interval := ts[i].Sub(ts[i-1]).Hours()
			if interval < shortestInterval {
				shortestInterval = interval
			}
			totalInterval += interval
		}

		meanInterval := totalInterval / float64(len(ts)-1)

		// Severity = frequency * density
		severity := (float64(len(ts)) / medianFrequency) * (100.0 / (meanInterval + 1.0))

		classification := "drift"
		if shortestInterval < 4.0 && len(ts) >= 3 {
			classification = "burst"
		}

		hotspots = append(hotspots, TemporalHotspot{
			Path:               path,
			CommitCount:        len(ts),
			FrequencyBaseline:  medianFrequency,
			ShortestIntervalHr: shortestInterval,
			MeanIntervalHr:     meanInterval,
			SeverityScore:      severity,
			Classification:     classification,
			Timestamps:         ts,
		})
	}

	// Sort hotspots by severity
	sort.Slice(hotspots, func(i, j int) bool {
		return hotspots[i].SeverityScore > hotspots[j].SeverityScore
	})

	// Only return top 10 hotspots
	if len(hotspots) > 10 {
		hotspots = hotspots[:10]
	}

	return &TemporalAnalysis{
		Available:        true,
		BaselineFound:    true,
		MedianFrequency:  medianFrequency,
		TemporalHotspots: hotspots,
		WindowDays:       30,
	}
}

// ==================== BUS FACTOR ANALYSIS ====================

func analyzeBusFactor(client *GitHubClient, owner, repo string, deps *DependencyAnalysis, concentration *ConcentrationAnalysis) *BusFactorAnalysis {
	log.Printf("[BusFactor] Deepening ownership analysis for %s/%s", owner, repo)

	// Fetch commits with details for authorship
	// We want a decent window to establish ownership
	commits, err := client.GetCommits(owner, repo, 50)
	if err != nil || len(commits) == 0 {
		return &BusFactorAnalysis{Available: false, Reason: "Insufficient commit history"}
	}

	fileAuthorCounts := make(map[string]map[string]int)
	authorTotalFiles := make(map[string]int)

	// Track critical paths from dependency analysis
	criticalPaths := make(map[string]bool)
	if deps != nil {
		for _, node := range deps.Nodes {
			if node.Category == "internal" && (node.Centrality > 0.5 || node.RiskScore > 50) {
				criticalPaths[node.ID] = true
			}
		}
	}

	// Hotspot paths also count as critical
	if concentration != nil {
		for i, hotspot := range concentration.Hotspots {
			if i < 5 { // Top 5 hotspots are always critical
				criticalPaths[hotspot.Path] = true
			}
		}
	}

	limit := len(commits)
	if limit > 25 {
		limit = 25 // Stay safe with rate limits
	}

	for i := 0; i < limit; i++ {
		sha := commits[i].SHA
		author := commits[i].Commit.Author.Name
		if author == "" {
			author = commits[i].Commit.Author.Email
		}

		files, err := client.GetCommitFiles(owner, repo, sha)
		if err != nil {
			continue
		}

		for _, file := range files {
			if _, exists := fileAuthorCounts[file]; !exists {
				fileAuthorCounts[file] = make(map[string]int)
			}
			fileAuthorCounts[file][author]++
			authorTotalFiles[author]++
		}
	}

	if len(fileAuthorCounts) == 0 {
		return &BusFactorAnalysis{Available: false, Reason: "No file-level authorship data available"}
	}

	var ownerships []FileOwnership
	contributorStats := make(map[string]*ContributorSurface)

	for path, authors := range fileAuthorCounts {
		totalCommits := 0
		maxCommits := 0
		topAuthor := ""

		for author, count := range authors {
			totalCommits += count
			if count > maxCommits {
				maxCommits = count
				topAuthor = author
			}
		}

		ownershipPercent := (float64(maxCommits) / float64(totalCommits)) * 100

		// Entropy-based score (simplified)
		// 1.0 = one author, 0.0 = perfectly distributed
		entropy := 1.0
		if len(authors) > 1 {
			// Shannons entropy simplified: 1 - (sum of (p * log2(p)) / max_entropy)
			// But for now, let's use a simpler: (max_commits / total_commits)
			entropy = ownershipPercent / 100.0
		}

		riskSignal := "distributed"
		if ownershipPercent > 80 {
			riskSignal = "silo"
		} else if ownershipPercent > 50 {
			riskSignal = "shared"
		}

		isCritical := criticalPaths[path]

		ownerships = append(ownerships, FileOwnership{
			Path:                path,
			TopContributor:      topAuthor,
			OwnershipPercentage: ownershipPercent,
			CommitDistribution:  authors,
			EntropyScore:        entropy,
			IsCritical:          isCritical,
			RiskSignal:          riskSignal,
		})

		// Update contributor surface
		if _, exists := contributorStats[topAuthor]; !exists {
			contributorStats[topAuthor] = &ContributorSurface{Name: topAuthor, KnowledgeSilos: []string{}}
		}
		if isCritical {
			contributorStats[topAuthor].CriticalFilesCount++
		}
		if riskSignal == "silo" {
			contributorStats[topAuthor].KnowledgeSilos = append(contributorStats[topAuthor].KnowledgeSilos, path)
		}
	}

	// Sort ownerships by criticality and percentage
	sort.Slice(ownerships, func(i, j int) bool {
		if ownerships[i].IsCritical != ownerships[j].IsCritical {
			return ownerships[i].IsCritical
		}
		return ownerships[i].OwnershipPercentage > ownerships[j].OwnershipPercentage
	})

	// Final list of contributors
	var surfaces []ContributorSurface
	totalSystemRisk := 0.0
	for _, os := range ownerships {
		if os.IsCritical {
			totalSystemRisk += os.OwnershipPercentage
		}
	}

	for name, stats := range contributorStats {
		riskOwned := 0.0
		for _, os := range ownerships {
			if os.IsCritical && os.TopContributor == name {
				riskOwned += os.OwnershipPercentage
			}
		}
		if totalSystemRisk > 0 {
			stats.OwnedRiskArea = (riskOwned / totalSystemRisk) * 100
		}
		surfaces = append(surfaces, *stats)
	}

	// Aggregated Risk Signal
	riskLevel := "Low"
	busFactor := len(contributorStats)

	// Real-world bus factor calculation
	// If one person owns > 50% of critical files, Bus Factor is essentially 1
	highRiskContributors := 0
	for _, s := range surfaces {
		if s.OwnedRiskArea > 50 {
			highRiskContributors++
		}
	}

	if busFactor <= 1 || highRiskContributors >= 1 {
		riskLevel = "High"
		busFactor = 1
	} else if busFactor <= 3 {
		riskLevel = "Moderate"
	}

	return &BusFactorAnalysis{
		Available:           true,
		RiskLevel:           riskLevel,
		FileOwnerships:      ownerships,
		ContributorSurfaces: surfaces,
		TotalContributors:   len(contributorStats),
		BusFactor:           busFactor,
	}
}

// ==================== DOCUMENTATION DRIFT ANALYSIS ====================

func analyzeDocDrift(client *GitHubClient, owner, repo string) *DocDriftAnalysis {
	log.Printf("[DocDrift] Analyzing documentation evolution for %s/%s", owner, repo)

	commits, err := client.GetCommits(owner, repo, 50)
	if err != nil || len(commits) == 0 {
		return &DocDriftAnalysis{Available: false, Reason: "Insufficient commit history"}
	}

	docCommitCount := 0
	codeCommitCount := 0
	mixedCommitCount := 0
	docChurn := 0
	codeChurn := 0

	var docTimestamps []time.Time
	var codeTimestamps []time.Time

	limit := len(commits)
	if limit > 30 {
		limit = 30
	}

	for i := 0; i < limit; i++ {
		sha := commits[i].SHA
		timestamp := commits[i].Commit.Author.Date
		files, err := client.GetCommitFiles(owner, repo, sha)
		if err != nil {
			continue
		}

		hasDoc := false
		hasCode := false
		commitChurn := len(files)

		for _, file := range files {
			ext := strings.ToLower(filepath.Ext(file))
			isDoc := ext == ".md" || strings.HasPrefix(file, "docs/") || strings.Contains(file, "/docs/")

			// Simple code detection
			isCode := ext == ".go" || ext == ".py" || ext == ".js" || ext == ".ts" || ext == ".tsx" || ext == ".jsx" || ext == ".c" || ext == ".cpp" || ext == ".java" || ext == ".rs"

			if isDoc {
				hasDoc = true
			} else if isCode {
				hasCode = true
			}
		}

		if hasDoc && hasCode {
			mixedCommitCount++
			docTimestamps = append(docTimestamps, timestamp)
			codeTimestamps = append(codeTimestamps, timestamp)
			docChurn += commitChurn / 2 // Approximation
			codeChurn += commitChurn / 2
		} else if hasDoc {
			docCommitCount++
			docTimestamps = append(docTimestamps, timestamp)
			docChurn += commitChurn
		} else if hasCode {
			codeCommitCount++
			codeTimestamps = append(codeTimestamps, timestamp)
			codeChurn += commitChurn
		}
	}

	totalAnalyzed := docCommitCount + codeCommitCount + mixedCommitCount
	if totalAnalyzed == 0 {
		return &DocDriftAnalysis{Available: false, Reason: "No documentation or code changes detected in recent window"}
	}

	driftRatio := float64(docCommitCount+mixedCommitCount) / float64(totalAnalyzed)

	// Temporal Offset calculation (Avg Doc Date - Avg Code Date)
	var avgDocTime int64
	var avgCodeTime int64
	if len(docTimestamps) > 0 {
		var sum int64
		for _, t := range docTimestamps {
			sum += t.Unix()
		}
		avgDocTime = sum / int64(len(docTimestamps))
	}
	if len(codeTimestamps) > 0 {
		var sum int64
		for _, t := range codeTimestamps {
			sum += t.Unix()
		}
		avgCodeTime = sum / int64(len(codeTimestamps))
	}

	offsetDays := 0.0
	if avgDocTime > 0 && avgCodeTime > 0 {
		offsetDays = float64(avgDocTime-avgCodeTime) / 86400.0
	}

	classification := "Aligned"
	interpretation := "Documentation and code evolution are synchronized."

	if docCommitCount > codeCommitCount*2 && docCommitCount > 5 {
		classification = "Documentation-leading"
		interpretation = "Documentation activity exceeds code changes, suggesting unstable scope or heavy planning phase."
	} else if codeCommitCount > (docCommitCount+mixedCommitCount)*3 && codeCommitCount > 5 {
		classification = "Code-leading"
		interpretation = "Significant code evolution is not accompanied by documentation updates, indicating rising knowledge debt."
	}

	if offsetDays > 5 {
		classification = "Documentation-leading"
		interpretation = "Documentation updates significantly lead code changes, suggesting documentation-driven development or stale docs."
	} else if offsetDays < -5 {
		classification = "Code-leading"
		interpretation = "Code changes precede documentation updates significantly."
	}

	return &DocDriftAnalysis{
		Available:          true,
		DocCommitCount:     docCommitCount,
		CodeCommitCount:    codeCommitCount,
		MixedCommitCount:   mixedCommitCount,
		DocChurn:           docChurn,
		CodeChurn:          codeChurn,
		DriftRatio:         driftRatio,
		TemporalOffsetDays: offsetDays,
		Classification:     classification,
		Interpretation:     interpretation,
	}
}

// ==================== TOPOLOGY ANALYSIS ENGINE ====================

// analyzeTopology computes topology from real directory structure
// No mock data - derives modules, clusters, and metrics from file tree
func analyzeTopology(tree *GitHubTreeResponse) *TopologyAnalysis {
	if tree == nil || len(tree.Tree) == 0 {
		return &TopologyAnalysis{
			Available: false,
			Reason:    "No file tree available",
			Metrics:   TopologyMetrics{},
			Modules:   make([]TopologyModule, 0),
			Clusters:  make([]TopologyCluster, 0),
			Edges:     make([]TopologyEdge, 0),
		}
	}

	// Ignore patterns
	ignorePatterns := []string{".git", "node_modules", "vendor", "__pycache__", "dist", "build", ".cache", ".vscode"}

	// Step 1: Collect files by top-level directory
	dirFiles := make(map[string][]string)
	dirExts := make(map[string]map[string]int)
	rootFiles := []string{}
	rootExts := make(map[string]int)

	for _, node := range tree.Tree {
		if node.Type != "blob" {
			continue
		}

		// Check ignore patterns
		skip := false
		for _, pattern := range ignorePatterns {
			if strings.Contains(node.Path, pattern) {
				skip = true
				break
			}
		}
		if skip {
			continue
		}

		parts := strings.Split(node.Path, "/")
		if len(parts) == 1 {
			rootFiles = append(rootFiles, node.Path)
			// Track root extensions
			if idx := strings.LastIndex(node.Path, "."); idx != -1 {
				ext := node.Path[idx:]
				rootExts[ext]++
			}
			continue
		}

		topDir := parts[0]
		dirFiles[topDir] = append(dirFiles[topDir], node.Path)

		// Track extensions
		if dirExts[topDir] == nil {
			dirExts[topDir] = make(map[string]int)
		}
		if idx := strings.LastIndex(node.Path, "."); idx != -1 {
			ext := node.Path[idx:]
			dirExts[topDir][ext]++
		}
	}

	// Add root files as a module if there are any
	if len(rootFiles) > 0 {
		dirFiles["(root)"] = rootFiles
		dirExts["(root)"] = rootExts
	}

	// Need at least 1 module
	if len(dirFiles) < 1 {
		return &TopologyAnalysis{
			Available: false,
			Reason:    "No files found in repository",
			Metrics:   TopologyMetrics{},
			Modules:   make([]TopologyModule, 0),
			Clusters:  make([]TopologyCluster, 0),
			Edges:     make([]TopologyEdge, 0),
		}
	}

	log.Printf("[Topology] Found %d directories: %v", len(dirFiles), func() []string {
		keys := make([]string, 0, len(dirFiles))
		for k := range dirFiles {
			keys = append(keys, k)
		}
		return keys
	}())

	// Step 2: Create modules from directories
	modules := make([]TopologyModule, 0)
	for dir, files := range dirFiles {
		// Determine dominant language
		lang := "Unknown"
		maxCount := 0
		for ext, count := range dirExts[dir] {
			if count > maxCount {
				maxCount = count
				switch ext {
				case ".go":
					lang = "Go"
				case ".py":
					lang = "Python"
				case ".js", ".jsx":
					lang = "JavaScript"
				case ".ts", ".tsx":
					lang = "TypeScript"
				case ".java":
					lang = "Java"
				case ".rs":
					lang = "Rust"
				case ".rb":
					lang = "Ruby"
				case ".php":
					lang = "PHP"
				case ".swift":
					lang = "Swift"
				case ".c", ".cpp", ".h":
					lang = "C/C++"
				case ".cs":
					lang = "C#"
				}
			}
		}

		modules = append(modules, TopologyModule{
			ID:         dir,
			Name:       dir,
			Path:       "/" + dir,
			FileCount:  len(files),
			Language:   lang,
			DependsOn:  []string{},
			DependedBy: []string{},
		})
	}

	// Sort modules by file count
	sort.Slice(modules, func(i, j int) bool {
		return modules[i].FileCount > modules[j].FileCount
	})

	// Step 3: Infer dependencies from naming conventions and structure
	// Simple heuristic: common prefixes/suffixes suggest relationships
	edges := make([]TopologyEdge, 0)
	for i := range modules {
		for j := range modules {
			if i == j {
				continue
			}
			// Dependency heuristics
			// 1. "test" or "tests" depends on main module
			if strings.Contains(modules[i].Name, "test") && !strings.Contains(modules[j].Name, "test") {
				edges = append(edges, TopologyEdge{
					Source: modules[i].ID,
					Target: modules[j].ID,
					Weight: 1,
				})
				modules[i].DependsOn = append(modules[i].DependsOn, modules[j].ID)
				modules[j].DependedBy = append(modules[j].DependedBy, modules[i].ID)
			}
			// 2. "utils", "lib", "common" are depended upon
			if strings.Contains(modules[j].Name, "lib") || strings.Contains(modules[j].Name, "util") || strings.Contains(modules[j].Name, "common") {
				if !strings.Contains(modules[i].Name, "lib") && !strings.Contains(modules[i].Name, "util") && !strings.Contains(modules[i].Name, "common") {
					edges = append(edges, TopologyEdge{
						Source: modules[i].ID,
						Target: modules[j].ID,
						Weight: 1,
					})
					modules[i].DependsOn = append(modules[i].DependsOn, modules[j].ID)
					modules[j].DependedBy = append(modules[j].DependedBy, modules[i].ID)
				}
			}
		}
	}

	// Calculate fan-in/fan-out
	for i := range modules {
		modules[i].FanOut = len(modules[i].DependsOn)
		modules[i].FanIn = len(modules[i].DependedBy)
	}

	// Step 4: Create clusters (group by first letter or language)
	clusterMap := make(map[string][]string)
	for _, mod := range modules {
		// Cluster by language
		clusterKey := mod.Language
		if clusterKey == "Unknown" {
			clusterKey = "Other"
		}
		clusterMap[clusterKey] = append(clusterMap[clusterKey], mod.ID)
	}

	clusters := make([]TopologyCluster, 0)
	totalFiles := 0
	for name, modIDs := range clusterMap {
		fileCount := 0
		for _, modID := range modIDs {
			for _, m := range modules {
				if m.ID == modID {
					fileCount += m.FileCount
					break
				}
			}
		}
		totalFiles += fileCount

		// Calculate risk index (0-100)
		// Higher risk: fewer modules, higher concentration
		riskIndex := 50.0
		if len(modIDs) == 1 {
			riskIndex += 30 // Single module cluster = higher risk
		}
		if fileCount > 50 {
			riskIndex += 10 // Large cluster
		}
		if riskIndex > 100 {
			riskIndex = 100
		}

		riskLevel := "low"
		if riskIndex >= 75 {
			riskLevel = "critical"
		} else if riskIndex >= 50 {
			riskLevel = "high"
		} else if riskIndex >= 25 {
			riskLevel = "medium"
		}

		clusters = append(clusters, TopologyCluster{
			ID:        strings.ToLower(strings.ReplaceAll(name, " ", "_")),
			Name:      name,
			ModuleIDs: modIDs,
			FileCount: fileCount,
			RiskIndex: riskIndex,
			RiskLevel: riskLevel,
		})
	}

	// Step 5: Calculate metrics
	avgRisk := 0.0
	for _, c := range clusters {
		avgRisk += c.RiskIndex
	}
	if len(clusters) > 0 {
		avgRisk /= float64(len(clusters))
	}

	// Entropy: variance in file distribution
	entropy := "Low"
	if len(modules) > 0 {
		avgFiles := float64(totalFiles) / float64(len(modules))
		variance := 0.0
		for _, m := range modules {
			diff := float64(m.FileCount) - avgFiles
			variance += diff * diff
		}
		variance /= float64(len(modules))
		if variance > 100 {
			entropy = "High"
		} else if variance > 50 {
			entropy = "Medium"
		}
	}

	// Cascading debt: based on edge count and connectivity
	cascadingDebt := "Inactive"
	if len(edges) > len(modules)/2 {
		cascadingDebt = "Neutral"
	}
	if len(edges) > len(modules) {
		cascadingDebt = "Active"
	}

	return &TopologyAnalysis{
		Available: true,
		Modules:   modules,
		Clusters:  clusters,
		Edges:     edges,
		Metrics: TopologyMetrics{
			SubDomainsTracked:   len(clusters),
			RegionalRiskIndex:   avgRisk,
			EntropyDensity:      entropy,
			CascadingDebtStatus: cascadingDebt,
			TotalModules:        len(modules),
			TotalEdges:          len(edges),
		},
	}
}

// ==================== STATE PERSISTENCE ====================

func loadState() {
	stateLock.Lock()
	defer stateLock.Unlock()

	data, err := os.ReadFile(stateFile)
	if err != nil {
		state = AppState{
			Analyses: make(map[string]*RepoAnalysis),
		}
		saveStateUnsafe()
		return
	}
	json.Unmarshal(data, &state)
	if state.Analyses == nil {
		state.Analyses = make(map[string]*RepoAnalysis)
	}

	// Clear stale connection if no token available (token is in-memory only for security)
	// Connection will persist only if GITHUB_TOKEN env is provided
	if state.Connection != nil && os.Getenv("GITHUB_TOKEN") == "" {
		log.Printf("[Startup] Clearing stale connection (token not available after restart)")
		state.Connection = nil
		saveStateUnsafe()
	}
}

func saveStateUnsafe() {
	data, _ := json.MarshalIndent(state, "", "  ")
	os.WriteFile(stateFile, data, 0644)
}

func saveState() {
	stateLock.Lock()
	defer stateLock.Unlock()
	saveStateUnsafe()
}

// ==================== CORS ====================

func enableCORS(w http.ResponseWriter) {
	w.Header().Set("Access-Control-Allow-Origin", "*")
	w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
	w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")
}

func corsMiddleware(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		enableCORS(w)
		if r.Method == "OPTIONS" {
			w.WriteHeader(http.StatusOK)
			return
		}
		next(w, r)
	}
}

// ==================== HTTP HANDLERS ====================

// GitHub Connection
func githubConnect(w http.ResponseWriter, r *http.Request) {
	if r.Method != "POST" {
		http.Error(w, "Method not allowed", 405)
		return
	}

	var input struct {
		Token        string `json:"token"`
		Organization string `json:"organization"`
	}
	body, _ := io.ReadAll(r.Body)
	json.Unmarshal(body, &input)

	if input.Token == "" {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(400)
		json.NewEncoder(w).Encode(map[string]string{"error": "Token required"})
		return
	}

	client := NewGitHubClient(input.Token)

	// Validate token
	user, err := client.GetAuthenticatedUser()
	if err != nil {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(401)
		json.NewEncoder(w).Encode(map[string]string{"error": "Invalid token: " + err.Error()})
		return
	}

	// Store token in memory
	githubToken = input.Token

	// Discover repos
	repos, err := client.ListUserRepos()
	if err != nil {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(500)
		json.NewEncoder(w).Encode(map[string]string{"error": "Failed to list repos: " + err.Error()})
		return
	}

	// Convert to our type
	var discovered []DiscoveredRepo
	for _, r := range repos {
		discovered = append(discovered, DiscoveredRepo{
			ID:            r.ID,
			FullName:      r.FullName,
			Name:          r.Name,
			Owner:         r.Owner.Login,
			Description:   r.Description,
			DefaultBranch: r.DefaultBranch,
			Language:      r.Language,
			Stars:         r.StargazersCount,
			Forks:         r.ForksCount,
			Private:       r.Private,
			UpdatedAt:     r.UpdatedAt,
			AnalysisState: "none",
		})
	}

	// Update state
	stateLock.Lock()
	state.Connection = &GitHubConnection{
		IsConnected:  true,
		Username:     user.Login,
		AvatarURL:    user.AvatarURL,
		Name:         user.Name,
		Organization: input.Organization,
		ConnectedAt:  time.Now(),
		RepoCount:    len(discovered),
	}
	state.DiscoveredRepos = discovered
	state.Analyses = make(map[string]*RepoAnalysis)
	saveStateUnsafe()
	stateLock.Unlock()

	log.Printf("[GitHub] Connected as %s, discovered %d repos", user.Login, len(discovered))

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"success":    true,
		"connection": state.Connection,
		"repoCount":  len(discovered),
	})
}

func githubDisconnect(w http.ResponseWriter, r *http.Request) {
	if r.Method != "POST" {
		http.Error(w, "Method not allowed", 405)
		return
	}

	githubToken = ""

	stateLock.Lock()
	state = AppState{
		Analyses: make(map[string]*RepoAnalysis),
	}
	saveStateUnsafe()
	stateLock.Unlock()

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]bool{"success": true})
}

func githubStatus(w http.ResponseWriter, r *http.Request) {
	stateLock.RLock()
	conn := state.Connection
	stateLock.RUnlock()

	w.Header().Set("Content-Type", "application/json")
	if conn == nil || !conn.IsConnected {
		json.NewEncoder(w).Encode(map[string]interface{}{
			"isConnected": false,
		})
		return
	}

	json.NewEncoder(w).Encode(conn)
}

// Projects
func listProjects(w http.ResponseWriter, r *http.Request) {
	stateLock.RLock()
	repos := state.DiscoveredRepos
	analyses := state.Analyses
	stateLock.RUnlock()

	// Update analysis states
	for i := range repos {
		if _, ok := analyses[repos[i].FullName]; ok {
			repos[i].AnalysisState = "ready"
		}
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(repos)
}

func analyzeProject(w http.ResponseWriter, r *http.Request) {
	if r.Method != "POST" {
		http.Error(w, "Method not allowed", 405)
		return
	}

	// Parse path: /api/projects/{owner}/{repo}/analyze
	path := strings.TrimPrefix(r.URL.Path, "/api/projects/")
	path = strings.TrimSuffix(path, "/analyze")
	parts := strings.Split(path, "/")
	if len(parts) != 2 {
		http.Error(w, "Invalid path", 400)
		return
	}
	owner, repo := parts[0], parts[1]
	fullName := owner + "/" + repo

	if githubToken == "" {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(401)
		json.NewEncoder(w).Encode(map[string]string{"error": "Not connected to GitHub"})
		return
	}

	// Find repo in discovered
	stateLock.RLock()
	var foundRepo *DiscoveredRepo
	for i := range state.DiscoveredRepos {
		if state.DiscoveredRepos[i].FullName == fullName {
			foundRepo = &state.DiscoveredRepos[i]
			break
		}
	}
	stateLock.RUnlock()

	if foundRepo == nil {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(404)
		json.NewEncoder(w).Encode(map[string]string{"error": "Project not found"})
		return
	}

	client := NewGitHubClient(githubToken)
	analysis, err := analyzeRepository(client, owner, repo, foundRepo.DefaultBranch)
	if err != nil {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(500)
		json.NewEncoder(w).Encode(map[string]string{"error": err.Error()})
		return
	}

	stateLock.Lock()
	state.Analyses[fullName] = analysis
	state.SelectedProject = fullName
	for i := range state.DiscoveredRepos {
		if state.DiscoveredRepos[i].FullName == fullName {
			state.DiscoveredRepos[i].AnalysisState = "ready"
			break
		}
	}
	saveStateUnsafe()
	stateLock.Unlock()

	w.Header().Set("Content-Type", "application/json")
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"success":  true,
		"project":  foundRepo,
		"analysis": analysis,
	})
}

func refreshAnalysis(w http.ResponseWriter, r *http.Request) {
	enableCORS(w)
	if r.Method == "OPTIONS" {
		return
	}
	if r.Method != "POST" {
		http.Error(w, "Method not allowed", 405)
		return
	}

	stateLock.RLock()
	selected := state.SelectedProject
	stateLock.RUnlock()

	if selected == "" {
		http.Error(w, "No project selected", 400)
		return
	}

	parts := strings.Split(selected, "/")
	owner, repo := parts[0], parts[1]

	// Find the repo to get the default branch
	stateLock.RLock()
	var foundRepo *DiscoveredRepo
	for i := range state.DiscoveredRepos {
		if state.DiscoveredRepos[i].FullName == selected {
			foundRepo = &state.DiscoveredRepos[i]
			break
		}
	}
	stateLock.RUnlock()

	defaultBranch := "main"
	if foundRepo != nil && foundRepo.DefaultBranch != "" {
		defaultBranch = foundRepo.DefaultBranch
	}

	// Re-run analysis
	client := NewGitHubClient(githubToken)
	log.Printf("[Refresh] Refreshing analysis for %s", selected)
	analysis, err := analyzeRepository(client, owner, repo, defaultBranch)
	if err != nil {
		http.Error(w, "Analysis failed: "+err.Error(), 500)
		return
	}

	stateLock.Lock()
	state.Analyses[selected] = analysis
	// Find project and set it to ready
	for i := range state.DiscoveredRepos {
		if state.DiscoveredRepos[i].FullName == selected {
			state.DiscoveredRepos[i].AnalysisState = "ready"
			break
		}
	}
	saveState()
	stateLock.Unlock()

	// Return the same format as getSelectedProject expects
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"selected": true,
		"project":  map[string]interface{}{"fullName": selected}, // Minimal for now to match frontend mapping
		"analysis": analysis,
	})
}

func getProject(w http.ResponseWriter, r *http.Request) {
	path := strings.TrimPrefix(r.URL.Path, "/api/projects/")
	parts := strings.Split(path, "/")
	if len(parts) != 2 {
		http.Error(w, "Invalid path", 400)
		return
	}
	owner, repo := parts[0], parts[1]
	fullName := owner + "/" + repo

	stateLock.RLock()
	var foundRepo *DiscoveredRepo
	for i := range state.DiscoveredRepos {
		if state.DiscoveredRepos[i].FullName == fullName {
			foundRepo = &state.DiscoveredRepos[i]
			break
		}
	}
	analysis := state.Analyses[fullName]
	stateLock.RUnlock()

	if foundRepo == nil {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(404)
		json.NewEncoder(w).Encode(map[string]string{"error": "Project not found"})
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(ProjectWithAnalysis{
		Repo:     *foundRepo,
		Analysis: analysis,
	})
}

func selectProject(w http.ResponseWriter, r *http.Request) {
	if r.Method != "POST" {
		http.Error(w, "Method not allowed", 405)
		return
	}

	var input struct {
		FullName string `json:"fullName"`
	}
	body, _ := io.ReadAll(r.Body)
	json.Unmarshal(body, &input)

	stateLock.Lock()
	state.SelectedProject = input.FullName
	saveStateUnsafe()
	stateLock.Unlock()

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]bool{"success": true})
}

func getSelectedProject(w http.ResponseWriter, _ *http.Request) {
	stateLock.RLock()
	selected := state.SelectedProject
	var foundRepo *DiscoveredRepo
	for i := range state.DiscoveredRepos {
		if state.DiscoveredRepos[i].FullName == selected {
			foundRepo = &state.DiscoveredRepos[i]
			break
		}
	}
	analysis := state.Analyses[selected]
	stateLock.RUnlock()

	if foundRepo == nil {
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]interface{}{
			"selected": false,
		})
		return
	}

	if analysis != nil {
		foundRepo.AnalysisState = "ready"
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"selected": true,
		"project":  foundRepo,
		"analysis": analysis,
	})
}

// ==================== PDF EXPORT ====================

func generatePDF(w http.ResponseWriter, r *http.Request) {
	enableCORS(w)
	if r.Method == "OPTIONS" {
		return
	}

	stateLock.RLock()
	conn := state.Connection
	selected := state.SelectedProject
	var repo *DiscoveredRepo
	for i := range state.DiscoveredRepos {
		if state.DiscoveredRepos[i].FullName == selected {
			repo = &state.DiscoveredRepos[i]
			break
		}
	}
	analysis := state.Analyses[selected]
	stateLock.RUnlock()

	pdf := fpdf.New("P", "mm", "A4", "")
	pdf.SetAutoPageBreak(false, 0)
	pdf.AddPage()

	pageWidth := 210.0
	pageHeight := 297.0

	for i := 0; i < 50; i++ {
		pdf.SetFillColor(15+i/3, 15+i/3, 20+i/2)
		pdf.Rect(0, float64(i), pageWidth, 1, "F")
	}

	pdf.SetTextColor(255, 255, 255)
	pdf.SetFont("Helvetica", "B", 26)
	pdf.Text(15, 22, "RISKSURFACE")
	pdf.SetFont("Helvetica", "", 10)
	pdf.SetTextColor(130, 130, 130)
	pdf.Text(15, 30, "Repository Analysis Report")

	pdf.SetFillColor(35, 35, 40)
	pdf.RoundedRect(pageWidth-55, 12, 45, 22, 3, "1234", "F")
	pdf.SetFont("Helvetica", "", 7)
	pdf.SetTextColor(100, 100, 100)
	pdf.Text(pageWidth-50, 19, "GENERATED")
	pdf.SetFont("Helvetica", "B", 9)
	pdf.SetTextColor(255, 255, 255)
	pdf.Text(pageWidth-50, 27, time.Now().Format("Jan 02, 2006"))

	pdf.SetFillColor(22, 22, 28)
	pdf.Rect(0, 50, pageWidth, 18, "F")
	pdf.SetFont("Helvetica", "", 7)
	pdf.SetTextColor(90, 90, 90)
	pdf.Text(15, 57, "GITHUB USER")
	pdf.SetFont("Helvetica", "B", 9)
	pdf.SetTextColor(180, 180, 180)
	username := "Not connected"
	if conn != nil {
		username = conn.Username
	}
	pdf.Text(15, 63, username)

	if repo != nil {
		pdf.SetFont("Helvetica", "", 7)
		pdf.SetTextColor(90, 90, 90)
		pdf.Text(80, 57, "REPOSITORY")
		pdf.SetFont("Helvetica", "B", 9)
		pdf.SetTextColor(180, 180, 180)
		pdf.Text(80, 63, repo.FullName)

		pdf.SetFont("Helvetica", "", 7)
		pdf.SetTextColor(90, 90, 90)
		pdf.Text(150, 57, "LANGUAGE")
		pdf.SetFont("Helvetica", "B", 9)
		pdf.SetTextColor(180, 180, 180)
		pdf.Text(150, 63, repo.Language)
	}

	if analysis != nil {
		y := 80.0
		a := analysis

		pdf.SetFont("Helvetica", "B", 12)
		pdf.SetTextColor(255, 255, 255)
		pdf.Text(15, y, "ANALYSIS RESULTS")

		y += 15
		metrics := []struct{ label, value string }{
			{"Files", fmt.Sprintf("%d", a.FileCount)},
			{"Directories", fmt.Sprintf("%d", a.DirectoryCount)},
			{"Commits (30d)", fmt.Sprintf("%d", a.CommitsLast30Days)},
			{"Activity Score", fmt.Sprintf("%.1f/10", a.ActivityScore)},
			{"Contributors", fmt.Sprintf("%d", a.ContributorCount)},
			{"Dependencies", fmt.Sprintf("%d", a.DependencyCount)},
		}

		for _, m := range metrics {
			pdf.SetFillColor(25, 25, 30)
			pdf.Rect(15, y, pageWidth-30, 12, "F")
			pdf.SetFont("Helvetica", "", 9)
			pdf.SetTextColor(150, 150, 150)
			pdf.Text(20, y+8, m.label)
			pdf.SetFont("Helvetica", "B", 10)
			pdf.SetTextColor(255, 255, 255)
			pdf.Text(120, y+8, m.value)
			y += 14
		}
	}

	pdf.SetFillColor(12, 12, 15)
	pdf.Rect(0, pageHeight-15, pageWidth, 15, "F")
	pdf.SetFont("Helvetica", "", 7)
	pdf.SetTextColor(70, 70, 70)
	pdf.Text(15, pageHeight-6, "Generated by RiskSurface")

	w.Header().Set("Content-Type", "application/pdf")
	w.Header().Set("Content-Disposition", "attachment; filename=risksurface-report.pdf")
	pdf.Output(w)
}

func generateCSV(w http.ResponseWriter, r *http.Request) {
	enableCORS(w)
	if r.Method == "OPTIONS" {
		return
	}

	stateLock.RLock()
	selected := state.SelectedProject
	analysis := state.Analyses[selected]
	stateLock.RUnlock()

	var csv string
	if analysis != nil {
		csv = fmt.Sprintf(`Metric,Value
Repository,%s
Files,%d
Directories,%d
Commits (30d),%d
Activity Score,%.1f
Contributors,%d
Dependencies,%d
`, selected, analysis.FileCount, analysis.DirectoryCount, analysis.CommitsLast30Days, analysis.ActivityScore, analysis.ContributorCount, analysis.DependencyCount)
	} else {
		csv = "No project selected or analyzed"
	}

	w.Header().Set("Content-Type", "text/csv")
	w.Header().Set("Content-Disposition", "attachment; filename=risksurface.csv")
	w.Write([]byte(csv))
}

// getProjectTopology returns real topology analysis for the selected project
func getProjectTopology(w http.ResponseWriter, r *http.Request) {
	if githubToken == "" {
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(&TopologyAnalysis{
			Available: false,
			Reason:    "Not connected to GitHub",
			Metrics:   TopologyMetrics{},
			Modules:   make([]TopologyModule, 0),
			Clusters:  make([]TopologyCluster, 0),
			Edges:     make([]TopologyEdge, 0),
		})
		return
	}

	// Get selected project
	stateLock.RLock()
	selected := state.SelectedProject
	var foundRepo *DiscoveredRepo
	for i := range state.DiscoveredRepos {
		if state.DiscoveredRepos[i].FullName == selected {
			foundRepo = &state.DiscoveredRepos[i]
			break
		}
	}
	stateLock.RUnlock()

	if foundRepo == nil {
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(&TopologyAnalysis{
			Available: false,
			Reason:    "No project selected",
		})
		return
	}

	// Fetch file tree from GitHub
	client := NewGitHubClient(githubToken)
	parts := strings.Split(selected, "/")
	if len(parts) != 2 {
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(&TopologyAnalysis{
			Available: false,
			Reason:    "Invalid project name",
		})
		return
	}

	branch := foundRepo.DefaultBranch
	if branch == "" {
		branch = "main"
	}

	tree, err := client.GetFileTree(parts[0], parts[1], branch)
	if err != nil {
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(&TopologyAnalysis{
			Available: false,
			Reason:    "Failed to fetch file tree: " + err.Error(),
		})
		return
	}

	// Analyze topology
	topology := analyzeTopology(tree)
	topology.ProjectFullName = selected // Critical: Tag with project identifier

	log.Printf("[Topology] Analyzed %s: %d modules, %d clusters, %d edges",
		selected, len(topology.Modules), len(topology.Clusters), len(topology.Edges))

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(topology)
}

func generateJSON(w http.ResponseWriter, r *http.Request) {
	enableCORS(w)
	if r.Method == "OPTIONS" {
		return
	}

	stateLock.RLock()
	conn := state.Connection
	selected := state.SelectedProject
	var repo *DiscoveredRepo
	for i := range state.DiscoveredRepos {
		if state.DiscoveredRepos[i].FullName == selected {
			repo = &state.DiscoveredRepos[i]
			break
		}
	}
	analysis := state.Analyses[selected]
	stateLock.RUnlock()

	data := map[string]interface{}{
		"connection": conn,
		"project":    repo,
		"analysis":   analysis,
		"generated":  time.Now().Format(time.RFC3339),
	}

	w.Header().Set("Content-Type", "application/json")
	w.Header().Set("Content-Disposition", "attachment; filename=risksurface.json")
	json.NewEncoder(w).Encode(data)
}

// ==================== MAIN ====================

func main() {
	loadState()

	// Try to use env token on startup
	if envToken := os.Getenv("GITHUB_TOKEN"); envToken != "" {
		githubToken = envToken
		log.Printf("[Startup] GitHub token loaded from environment")
	}

	// GitHub Connection
	http.HandleFunc("/api/github/connect", corsMiddleware(githubConnect))
	http.HandleFunc("/api/github/disconnect", corsMiddleware(githubDisconnect))
	http.HandleFunc("/api/github/status", corsMiddleware(githubStatus))

	// Projects
	http.HandleFunc("/api/projects", corsMiddleware(listProjects))
	http.HandleFunc("/api/projects/select", corsMiddleware(selectProject))
	http.HandleFunc("/api/projects/selected", corsMiddleware(func(w http.ResponseWriter, r *http.Request) {
		switch r.Method {
		case "GET":
			getSelectedProject(w, r)
		case "POST":
			selectProject(w, r)
		}
	}))
	http.HandleFunc("/api/projects/", corsMiddleware(func(w http.ResponseWriter, r *http.Request) {
		if strings.HasSuffix(r.URL.Path, "/analyze") {
			analyzeProject(w, r)
		} else {
			getProject(w, r)
		}
	}))

	// Exports
	http.HandleFunc("/api/export/pdf", corsMiddleware(generatePDF))
	http.HandleFunc("/api/export/csv", corsMiddleware(generateCSV))
	http.HandleFunc("/api/export/json", corsMiddleware(generateJSON))

	// Topology
	http.HandleFunc("/api/topology", corsMiddleware(getProjectTopology))

	// Analysis
	http.HandleFunc("/api/analysis/refresh", corsMiddleware(refreshAnalysis))

	// Health check endpoint for cron jobs (lightweight, no DB load)
	http.HandleFunc("/health", func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		w.Write([]byte("OK"))
	})

	// Dynamic port for deployment
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	fmt.Println("🚀 RiskSurface API Server (Real Analysis)")
	fmt.Printf("   http://localhost:%s\n", port)
	fmt.Println("")
	if githubToken != "" {
		fmt.Println("   ✅ GitHub Token: Pre-configured from environment")
	} else {
		fmt.Println("   ⏳ Waiting for GitHub connection via UI...")
	}
	fmt.Println("")
	fmt.Println("   Endpoints:")
	fmt.Println("   POST /api/github/connect    - Connect GitHub account")
	fmt.Println("   POST /api/github/disconnect - Disconnect")
	fmt.Println("   GET  /api/github/status     - Connection status")
	fmt.Println("   GET  /api/projects          - List discovered repos")
	fmt.Println("   POST /api/projects/{o}/{r}/analyze - Analyze a project")
	fmt.Println("   GET  /api/projects/selected - Get selected project")
	fmt.Println("   GET  /api/topology          - System topology (real analysis)")

	log.Fatal(http.ListenAndServe(":"+port, nil))
}

// ==================== COMMIT INTENT ANALYSIS ====================

func classifyCommitIntent(message string, files []string) (string, float64, string) {
	msg := strings.ToLower(message)

	// Priority 1: fix
	if strings.HasPrefix(msg, "fix:") || strings.HasPrefix(msg, "hotfix:") || strings.HasPrefix(msg, "bugfix:") ||
		strings.Contains(msg, "fix ") || strings.Contains(msg, "bug") || strings.Contains(msg, "issue #") {
		return "fix", 0.9, "message_keywords"
	}

	// Priority 2: feature
	if strings.HasPrefix(msg, "feat:") || strings.HasPrefix(msg, "feature:") || strings.Contains(msg, "feat ") || strings.Contains(msg, "feature ") || strings.HasPrefix(msg, "add ") {
		return "feature", 0.85, "message_keywords"
	}

	// Priority 3: perf
	if strings.HasPrefix(msg, "perf:") || strings.Contains(msg, "performance") || strings.Contains(msg, "optimize") || strings.Contains(msg, "speed up") {
		return "perf", 0.9, "message_keywords"
	}

	// Priority 4: refactor
	if strings.HasPrefix(msg, "refactor:") || strings.Contains(msg, "refactor") || strings.Contains(msg, "cleanup") {
		return "refactor", 0.8, "message_keywords"
	}

	// Priority 5: test
	hasTestFile := false
	for _, f := range files {
		lowF := strings.ToLower(f)
		if strings.Contains(lowF, "test") || strings.Contains(lowF, "_spec") || strings.HasSuffix(lowF, ".spec.ts") || strings.HasSuffix(lowF, ".spec.js") {
			hasTestFile = true
			break
		}
	}
	if strings.HasPrefix(msg, "test:") || strings.Contains(msg, "test ") || hasTestFile {
		return "test", 0.8, "file_path_or_message"
	}

	// Priority 6: docs
	hasDocFile := false
	for _, f := range files {
		ext := strings.ToLower(filepath.Ext(f))
		if ext == ".md" || strings.HasPrefix(f, "docs/") || strings.Contains(f, "/docs/") || strings.Contains(strings.ToLower(f), "readme") {
			hasDocFile = true
			break
		}
	}
	if strings.HasPrefix(msg, "docs:") || strings.Contains(msg, "doc ") || strings.Contains(msg, "document") || hasDocFile {
		return "docs", 0.85, "file_path_or_message"
	}

	// Priority 7: chore
	if strings.HasPrefix(msg, "chore:") || strings.Contains(msg, "build") || strings.Contains(msg, "ci") || strings.Contains(msg, "deps") || strings.Contains(msg, "version") {
		return "chore", 0.7, "message_keywords"
	}

	return "unknown", 0.3, "no_strong_signals"
}

func analyzeCommitIntents(client *GitHubClient, owner, repo string, commits []GitHubCommit) *IntentDistribution {
	counts := make(map[string]int)
	total := 0
	lowConfidenceCount := 0

	limit := len(commits)
	if limit > 50 {
		limit = 50
	}

	for i := 0; i < limit; i++ {
		sha := commits[i].SHA
		message := commits[i].Commit.Message

		files := []string{}
		if i < 15 { // Deeper analysis for the most recent ones
			f, err := client.GetCommitFiles(owner, repo, sha)
			if err == nil {
				files = f
			}
		}

		intent, confidence, _ := classifyCommitIntent(message, files)
		counts[intent]++
		total++
		if confidence < 0.5 {
			lowConfidenceCount++
		}
	}

	if total == 0 {
		return &IntentDistribution{Available: false, Reason: "No commits found"}
	}

	percentages := make(map[string]float64)
	maxCount := 0
	dominant := "unknown"
	for intent, count := range counts {
		percentages[intent] = (float64(count) / float64(total)) * 100
		if count > maxCount && intent != "unknown" {
			maxCount = count
			dominant = intent
		}
	}

	focusShift := fmt.Sprintf("Recent activity is dominated by %s efforts.", dominant)
	if dominant == "unknown" {
		focusShift = "No dominant development focus detected in recent commits."
	}

	return &IntentDistribution{
		Available:         true,
		Intents:           counts,
		Percentages:       percentages,
		DominantIntent:    dominant,
		RecentFocusShift:  focusShift,
		ConfidenceWarning: (float64(lowConfidenceCount) / float64(total)) > 0.4,
	}
}

// ==================== STRUCTURAL DEPTH ANALYSIS ====================

func analyzeStructuralDepth(tree []GitHubTreeNode) *StructuralDepthAnalysis {
	if len(tree) == 0 {
		return &StructuralDepthAnalysis{Available: false}
	}

	filesPerDepth := make(map[int]int)
	depths := []int{}
	fileCount := 0
	maxDepth := 0
	dirCounts := make(map[string]int)

	for _, node := range tree {
		if node.Type == "blob" {
			parts := strings.Split(node.Path, "/")
			depth := len(parts) - 1
			filesPerDepth[depth]++
			depths = append(depths, depth)
			fileCount++
			if depth > maxDepth {
				maxDepth = depth
			}

			// Track files per directory for imbalance detection
			if len(parts) > 1 {
				dir := strings.Join(parts[:len(parts)-1], "/")
				dirCounts[dir]++
			} else {
				dirCounts["root"]++
			}
		}
	}

	if fileCount < 5 {
		return &StructuralDepthAnalysis{Available: false}
	}

	// Calculate Mean
	sum := 0
	for _, d := range depths {
		sum += d
	}
	meanDepth := float64(sum) / float64(fileCount)

	// Calculate Median
	sort.Ints(depths)
	medianDepth := 0.0
	if fileCount%2 == 0 {
		medianDepth = float64(depths[fileCount/2-1]+depths[fileCount/2]) / 2.0
	} else {
		medianDepth = float64(depths[fileCount/2])
	}

	surfaceRatio := float64(fileCount) / float64(maxDepth+1)

	// Determine Status
	status := "layered"
	if maxDepth <= 2 {
		status = "flat"
	} else if maxDepth >= 6 {
		status = "deeply nested"
	} else if surfaceRatio > 15 && maxDepth < 4 {
		status = "broad surface"
	}

	// Imbalance Detection
	imbalances := []string{}

	// 1. Monolithic Directory Detection
	for dir, count := range dirCounts {
		if float64(count)/float64(fileCount) > 0.6 && fileCount > 10 {
			imbalances = append(imbalances, fmt.Sprintf("Concentrated in /%s", dir))
		}
	}

	// 2. Root Concentration
	rootFiles := filesPerDepth[0] + filesPerDepth[1]
	if float64(rootFiles)/float64(fileCount) > 0.8 && maxDepth > 2 {
		imbalances = append(imbalances, "High root-level density")
	}

	// 3. Deep Fragmentation
	if maxDepth > 4 && filesPerDepth[maxDepth] < 3 && filesPerDepth[maxDepth-1] > 10 {
		imbalances = append(imbalances, "Deep-level fragmentation")
	}

	return &StructuralDepthAnalysis{
		Available:       true,
		MaxDepth:        maxDepth,
		MeanDepth:       meanDepth,
		MedianDepth:     medianDepth,
		FilesPerDepth:   filesPerDepth,
		Imbalances:      imbalances,
		SurfaceRatio:    surfaceRatio,
		StructureStatus: status,
	}
}

// ==================== ACTIVITY VOLATILITY ANALYSIS ====================

func analyzeActivityVolatility(commits []GitHubCommit) *ActivityVolatility {
	if len(commits) < 5 {
		return &ActivityVolatility{Available: false}
	}

	// 1. Build daily buckets for the last 30 days
	buckets := make(map[string]int)
	now := time.Now()
	for i := 0; i < 30; i++ {
		day := now.AddDate(0, 0, -i).Format("2006-01-02")
		buckets[day] = 0
	}

	totalCommits := 0
	for _, c := range commits {
		day := c.Commit.Author.Date.Format("2006-01-02")
		if _, ok := buckets[day]; ok {
			buckets[day]++
			totalCommits++
		}
	}

	// 2. Extract counts into sorted slice
	days := make([]string, 0, len(buckets))
	for d := range buckets {
		days = append(days, d)
	}
	sort.Strings(days)

	counts := make([]int, len(days))
	for i, d := range days {
		counts[i] = buckets[d]
	}

	// 3. Compute stats
	mean := float64(totalCommits) / 30.0

	// Standard Deviation
	var varianceSum float64
	for _, c := range counts {
		diff := float64(c) - mean
		varianceSum += diff * diff
	}
	stdDev := math.Sqrt(varianceSum / 30.0)

	// Coefficient of Variation (Volatility Score)
	volatilityScore := 0.0
	if mean > 0 {
		volatilityScore = stdDev / mean
	}

	// 4. Burst Detection
	bursts := []string{}
	burstThreshold := mean * 3.0 // More than 3x the average
	if mean < 0.2 {
		burstThreshold = 3.0 // Minimum 3 commits if average is very low
	}

	for i, c := range counts {
		if float64(c) >= burstThreshold && c > 1 {
			bursts = append(bursts, days[i])
		}
	}

	// 5. Classification
	classification := "Low"
	interpretation := "Activity is steady and predictable."
	if volatilityScore > 2.0 {
		classification = "High"
		interpretation = "Activity is highly burst-driven, indicating sporadic development rhythms."
	} else if volatilityScore > 1.0 {
		classification = "Moderate"
		interpretation = "Development shows occasional surges but maintains a baseline."
	}

	return &ActivityVolatility{
		Available:        true,
		BucketSize:       "daily",
		BucketCounts:     counts,
		BaselineActivity: mean,
		VolatilityScore:  volatilityScore,
		Classification:   classification,
		BurstPeriods:     bursts,
		Interpretation:   interpretation,
	}
}

// ==================== TEST SURFACE ANALYSIS ====================

func analyzeTestSurface(tree []GitHubTreeNode, deps []DependencyDetail) *TestSurfaceAnalysis {
	if len(tree) == 0 {
		return &TestSurfaceAnalysis{Available: false}
	}

	testFiles := 0
	prodFiles := 0
	testDirs := make(map[string]bool)
	prodDirs := make(map[string]bool)

	codeExtensions := map[string]bool{
		".go": true, ".ts": true, ".tsx": true, ".js": true, ".jsx": true, ".py": true,
		".rb": true, ".java": true, ".cpp": true, ".c": true, ".h": true, ".rs": true,
		".cs": true, ".php": true, ".swift": true, ".kt": true,
	}

	for _, node := range tree {
		if node.Type != "blob" {
			continue
		}

		ext := filepath.Ext(node.Path)
		if !codeExtensions[ext] {
			continue
		}

		lowPath := strings.ToLower(node.Path)
		isTest := false

		// Rules for test identification
		if strings.Contains(lowPath, "/test/") || strings.Contains(lowPath, "/tests/") ||
			strings.Contains(lowPath, "/__tests__/") || strings.HasPrefix(lowPath, "test/") ||
			strings.Contains(lowPath, "_test.") || strings.Contains(lowPath, ".test.") ||
			strings.Contains(lowPath, ".spec.") || strings.Contains(lowPath, "test_") {
			isTest = true
		}

		dir := filepath.Dir(node.Path)
		if isTest {
			testFiles++
			testDirs[dir] = true
		} else {
			// Exclude documentation and vendor if possible
			if !strings.Contains(lowPath, "vendor/") && !strings.Contains(lowPath, "node_modules/") &&
				!strings.Contains(lowPath, "docs/") && !strings.Contains(lowPath, ".github/") {
				prodFiles++
				prodDirs[dir] = true
			}
		}
	}

	if prodFiles == 0 && testFiles == 0 {
		return &TestSurfaceAnalysis{Available: false}
	}

	// Correlation with dependencies
	testDepsFound := []string{}
	testLibKeywords := []string{"test", "pytest", "jest", "mocha", "chai", "junit", "enzyme", "testing", "vitest", "cypress"}
	for _, d := range deps {
		lowDep := strings.ToLower(d.Name)
		for _, kw := range testLibKeywords {
			if strings.Contains(lowDep, kw) {
				testDepsFound = append(testDepsFound, d.Name)
				break
			}
		}
	}

	ratio := 0.0
	if prodFiles > 0 {
		ratio = (float64(testFiles) / float64(prodFiles)) * 100.0
	}

	percentage := 0.0
	if (prodFiles + testFiles) > 0 {
		percentage = (float64(testFiles) / float64(prodFiles+testFiles)) * 100.0
	}

	distribution := "centralized"
	sharedCount := 0
	for d := range testDirs {
		if prodDirs[d] {
			sharedCount++
		}
	}
	if sharedCount > 0 {
		if float64(sharedCount)/float64(len(testDirs)+1) > 0.5 {
			distribution = "co-located"
		} else {
			distribution = "mixed"
		}
	}

	mismatched := len(testDepsFound) > 0 && testFiles == 0

	interpretation := "Test surface is proportional to production code."
	if testFiles == 0 {
		interpretation = "No test surface detected."
		if len(testDepsFound) > 0 {
			interpretation = "Test dependencies exist but no test files were identified."
		}
	} else if ratio < 10 {
		interpretation = "Test surface is minimal relative to production code."
	} else if ratio > 50 {
		interpretation = "Robust structural test surface detected."
	}

	return &TestSurfaceAnalysis{
		Available:             true,
		ProductionFileCount:   prodFiles,
		TestFileCount:         testFiles,
		SurfaceRatio:          ratio,
		TestPercentage:        percentage,
		Distribution:          distribution,
		MismatchedDeps:        mismatched,
		TestDependenciesFound: testDepsFound,
		Interpretation:        interpretation,
	}
}

// ==================== SECURITY CONSISTENCY ANALYSIS ====================

func analyzeSecurityConsistency(client *GitHubClient, owner, repo string, tree []GitHubTreeNode, deps []DependencyDetail) *SecurityConsistencyAnalysis {
	// 1. Fetch README
	readmeNames := []string{"README.md", "README", "readme.md"}
	var readmeContent string
	for _, name := range readmeNames {
		content, err := client.GetFileContent(owner, repo, name)
		if err == nil {
			readmeContent = strings.ToLower(string(content))
			break
		}
	}

	if readmeContent == "" {
		return &SecurityConsistencyAnalysis{Available: false}
	}

	// 2. Define Claims to look for
	claimDefinitions := map[string][]string{
		"Differential Privacy": {"differential privacy", "dp-sgd", "noise addition", "laplace mechanism", "gaussian mechanism", "epsilon-delta"},
		"Encryption":           {"encryption", "cryptographic", "aes-", "rsa-", "public key", "private key", "secure communication", "transport layer security"},
		"Secure Aggregation":   {"secure aggregation", "secagg", "distributed aggregation", "multi-party computation", "secure multiparty"},
		"Anonymization":        {"anonymity", "anonymization", "k-anonymity", "pseudonymize", "de-identification"},
		"Data Integrity":       {"integrity", "checksum", "hash verification", "digital signature", "tamper-proof"},
	}

	// 3. Define Supporting Signals (Libs/Keywords)
	signalLibs := map[string][]string{
		"Differential Privacy": {"opacus", "diffpriv", "google-dp", "ibm-differential-privacy", "noise", "laplace", "gaussian"},
		"Encryption":           {"cryptography", "pycryptodome", "nacl", "sodium", "openssl", "aes", "rsa", "ecdsa", "crypto"},
		"Secure Aggregation":   {"mpc", "secagg", "secret-sharing", "homomorphic"},
		"Anonymization":        {"pseudonym", "anonymise", "faker"},
		"Data Integrity":       {"hashlib", "hmac", "sha256", "sha512", "md5", "argon2"},
	}

	claims := []SecurityClaim{}
	supportedCount := 0

	for claim, keywords := range claimDefinitions {
		foundClaim := false
		for _, kw := range keywords {
			if strings.Contains(readmeContent, kw) {
				foundClaim = true
				break
			}
		}

		if foundClaim {
			supportingSignals := []string{}
			evidence := []string{}

			// Check dependencies
			for _, d := range deps {
				lowDep := strings.ToLower(d.Name)
				for _, sig := range signalLibs[claim] {
					if strings.Contains(lowDep, sig) {
						supportingSignals = append(supportingSignals, d.Name)
						evidence = append(evidence, "dependency:"+d.Name)
						break
					}
				}
			}

			// Check file tree for suspicious filenames/paths
			for _, node := range tree {
				lowPath := strings.ToLower(node.Path)
				for _, sig := range signalLibs[claim] {
					if strings.Contains(lowPath, sig) {
						supportingSignals = append(supportingSignals, node.Path)
						evidence = append(evidence, "file:"+node.Path)
						break
					}
				}
			}

			classification := "Uncorroborated"
			if len(supportingSignals) >= 2 {
				classification = "Supported"
				supportedCount++
			} else if len(supportingSignals) == 1 {
				classification = "Weakly Supported"
				supportedCount++
			}

			claims = append(claims, SecurityClaim{
				Claim:             claim,
				SupportingSignals: supportingSignals,
				Evidence:          evidence,
				Classification:    classification,
			})
		}
	}

	if len(claims) == 0 {
		return &SecurityConsistencyAnalysis{Available: false}
	}

	status := "Weak"
	if supportedCount == len(claims) {
		status = "Consistent"
	} else if supportedCount > 0 {
		status = "Partial"
	}

	var interpretation string
	switch status {
	case "Consistent":
		interpretation = "Privacy and security claims are well-supported by observable repository signals."
	case "Weak":
		interpretation = "Privacy and security claims lack significant corroborating signals in the codebase."
	default:
		interpretation = "Privacy and security claims are partially corroborated by repository signals."
	}

	return &SecurityConsistencyAnalysis{
		Available:      true,
		Claims:         claims,
		OverallStatus:  status,
		Interpretation: interpretation,
	}
}
