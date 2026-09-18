from typing import List, Dict, Any, Optional
from pydantic import BaseModel, Field, ConfigDict

class BaseSchema(BaseModel):
    model_config = ConfigDict(protected_namespaces=())

class DatasetProfile(BaseModel):
    filename: str
    row_count: int
    column_count: int
    features: List[str]
    target_column: Optional[str] = None
    target_type: Optional[str] = None  # binary_classification, multiclass_classification, regression
    target_classes: Optional[List[Any]] = None
    missing_value_counts: Dict[str, int]
    numerical_features: List[str]
    categorical_features: List[str]
    constant_features: List[str] = []
    cardinality: Dict[str, int] = {}
    sample_preview: List[Dict[str, Any]] = []

class PreprocessingSummary(BaseModel):
    original_row_count: int
    cleaned_row_count: int
    imputed_columns: Dict[str, str]
    encoded_columns: Dict[str, str]
    scaled_columns: List[str]
    dropped_columns: List[str]
    warnings: List[str]

class ModelMetric(BaseSchema):
    model_name: str
    accuracy: float
    precision: float
    recall: float
    f1: float
    roc_auc: Optional[float] = None
    confusion_matrix: List[List[int]]

class FeatureImportanceItem(BaseSchema):
    feature: str
    shap_importance: float
    permutation_importance: float
    model_importance: float
    unified_rank: int

class CorrelationPair(BaseModel):
    feature_a: str
    feature_b: str
    correlation: float
    risk_level: str  # LOW, MODERATE, HIGH

class VIFItem(BaseModel):
    feature: str
    vif: float
    risk_level: str  # LOW, MODERATE, HIGH

class ProxyRiskItem(BaseModel):
    feature: str
    proxy_score: float  # 0 to 1
    associated_feature: Optional[str]
    association_type: str
    risk_level: str
    description: str

class StabilityItem(BaseModel):
    feature: str
    mean_rank: float
    rank_std: float
    mean_importance: float
    importance_std: float
    top_5_frequency: float  # 0 to 100%
    stability_score: float  # 0 to 100
    stability_level: str  # HIGH, MODERATE, LOW

class ModelAgreementItem(BaseSchema):
    feature: str
    rank_variance_across_models: float
    agreement_score: float  # 0 to 100
    model_ranks: Dict[str, int]
    agreement_level: str  # HIGH, MODERATE, LOW

class SubgroupItem(BaseModel):
    feature: str
    subgroup_feature: str
    subgroup_importances: Dict[str, float]
    variation_score: float
    sample_sizes: Dict[str, int]
    is_valid: bool
    warning: Optional[str] = None

class PerturbationItem(BaseModel):
    feature: str
    baseline_f1: float
    shuffled_f1: float
    removed_f1: float
    f1_delta: float
    functional_impact: str  # STRONG, MODERATE, WEAK, INCONSISTENT

class FeatureReliabilitySummary(BaseModel):
    feature: str
    importance: float
    reliability_score: float  # 0 to 100
    classification: str  # RELIABLE, NEEDS_REVIEW, POTENTIALLY_MISLEADING
    signals: Dict[str, float]  # normalized 0-1 risk
    score_calculation: Dict[str, float]  # points deducted per category
    evidence: Dict[str, Any]
    warnings: List[str]
    plain_language_explanation: str

class AnalysisConfig(BaseModel):
    target_column: str
    models_to_train: List[str] = ["logistic_regression", "decision_tree", "random_forest", "xgboost"]
    explanation_methods: List[str] = ["shap", "permutation", "model_based"]
    correlation_threshold: float = 0.80
    vif_threshold: float = 10.0
    stability_runs: int = 15
    reliability_weights: Optional[Dict[str, float]] = None
    subgroup_column: Optional[str] = None
    sensitive_column: Optional[str] = None
    random_seed: int = 42

class AnalysisStatusResponse(BaseModel):
    analysis_id: str
    status: str  # QUEUED, PREPROCESSING, TRAINING, EXPLAINING, ANALYZING, GENERATING_REPORT, COMPLETED, FAILED
    progress_percentage: int
    current_stage: str
    error_message: Optional[str] = None

class SyntheticDataConfig(BaseModel):
    rows: int = 1000
    noise_level: float = 0.1
    random_seed: int = 42

class SyntheticEvaluationMetrics(BaseModel):
    feature_name: str
    ground_truth_role: str  # TRUE_SIGNAL, CORRELATED, PROXY, REDUNDANT, NOISE
    importance: float
    predictx_reliability_score: float
    predictx_classification: str
    is_correctly_classified: bool
    rationale: str

class SyntheticEvaluationSummary(BaseModel):
    precision: float
    recall: float
    f1: float
    accuracy: float
    feature_evaluations: List[SyntheticEvaluationMetrics]
    qualitative_evaluation_note: str

class APIResponse(BaseModel):
    success: bool
    data: Optional[Any] = None
    message: Optional[str] = None
    error: Optional[Dict[str, Any]] = None
