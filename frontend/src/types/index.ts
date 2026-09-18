export interface DatasetProfile {
  row_count: number;
  column_count: number;
  features: string[];
  target_column?: string;
  target_info?: {
    target_type: string;
    target_classes: string[];
    class_counts: Record<string, number>;
  };
  missing_value_counts: Record<string, number>;
  numerical_features: string[];
  categorical_features: string[];
  constant_features: string[];
  cardinality: Record<string, number>;
  sample_preview: Record<string, any>[];
  ground_truth?: Record<string, string>;
}

export interface ModelMetric {
  model_name: string;
  accuracy: number;
  precision: number;
  recall: number;
  f1: number;
  roc_auc?: number;
  confusion_matrix: number[][];
  status: string;
  warning?: string;
}

export interface FeatureImportanceItem {
  feature: string;
  shap_importance: number;
  permutation_importance: number;
  model_importance: number;
  consensus_importance: number;
  unified_rank: number;
}

export interface CorrelationPair {
  feature_a: string;
  feature_b: string;
  correlation: number;
  abs_correlation: number;
  risk_level: string;
  warning: string;
}

export interface CorrelationAnalysis {
  matrix: Record<string, any>[];
  feature_names: string[];
  high_risk_pairs: CorrelationPair[];
  feature_max_corr: Record<string, number>;
  threshold_used: number;
}

export interface VIFItem {
  feature: string;
  vif: number;
  risk_level: string;
  warning: string;
}

export interface StabilityItem {
  feature: string;
  mean_rank: number;
  rank_std: number;
  mean_importance: number;
  importance_std: number;
  top_5_frequency: number;
  stability_score: number;
  stability_level: string;
  warning: string;
  rank_samples?: number[];
}

export interface ModelAgreementItem {
  feature: string;
  rank_variance: number;
  rank_std: number;
  rank_spread: number;
  agreement_score: number;
  agreement_level: string;
  warning: string;
  model_ranks: Record<string, number>;
  model_importances: Record<string, number>;
}

export interface SubgroupItem {
  feature: string;
  subgroup_feature: string;
  subgroup_importances: Record<string, number>;
  variation_score: number;
  sample_sizes: Record<string, number>;
  is_valid: boolean;
  warning: string;
}

export interface PerturbationItem {
  feature: string;
  baseline_f1: number;
  shuffled_f1: number;
  removed_f1: number;
  f1_delta: number;
  functional_impact: string;
  warning: string;
}

export interface ReliabilityEvaluation {
  feature: string;
  importance: number;
  reliability_score: number;
  classification: "RELIABLE" | "NEEDS_REVIEW" | "POTENTIALLY_MISLEADING";
  signals: {
    correlation_risk: number;
    proxy_risk: number;
    instability_risk: number;
    model_disagreement_risk: number;
    subgroup_variation_risk: number;
    perturbation_risk: number;
  };
  score_calculation: {
    correlation: number;
    proxy: number;
    stability: number;
    model_agreement: number;
    subgroup: number;
    perturbation: number;
  };
  evidence: {
    consensus_importance: number;
    shap_importance: number;
    unified_rank: number;
    max_correlation: number;
    vif: number;
    proxy_score: number;
    associated_proxy_feature?: string;
    rank_std: number;
    top_5_frequency: number;
    model_rank_spread: number;
    subgroup_variation_score: number;
    perturbation_f1_delta: number;
    functional_impact: string;
  };
  warnings: string[];
  plain_language_explanation: string;
}

export interface AnalysisOverview {
  analysis_id: string;
  dataset_id: string;
  dataset_name: string;
  target_column: string;
  timestamp: string;
  best_model_name: string;
  preprocessing_summary: {
    original_row_count: number;
    cleaned_row_count: number;
    imputed_columns: Record<string, string>;
    encoded_columns: Record<string, string>;
    scaled_columns: string[];
    dropped_columns: string[];
    warnings: string[];
  };
  model_metrics: Record<string, ModelMetric>;
  unified_importances: FeatureImportanceItem[];
  correlation_analysis: CorrelationAnalysis;
  vif_analysis: VIFItem[];
  stability_analysis: StabilityItem[];
  model_agreement_analysis: {
    agreement_matrix: Record<string, any>[];
    feature_agreements: ModelAgreementItem[];
    model_names: string[];
  };
  subgroup_analysis: SubgroupItem[];
  perturbation_analysis: PerturbationItem[];
  reliability_evaluations: ReliabilityEvaluation[];
  config: Record<string, any>;
}

export interface JobStatus {
  analysis_id: string;
  status: "QUEUED" | "PREPROCESSING" | "TRAINING" | "EXPLAINING" | "ANALYZING" | "GENERATING_REPORT" | "COMPLETED" | "FAILED" | "NOT_FOUND";
  progress_percentage: number;
  current_stage: string;
  error_message?: string;
}

export interface SyntheticEvaluation {
  precision: number;
  recall: number;
  f1: number;
  accuracy: number;
  is_synthetic: boolean;
  note?: string;
  feature_evaluations?: {
    feature_name: string;
    ground_truth_role: string;
    importance: number;
    predictx_reliability_score: number;
    predictx_classification: string;
    is_correctly_classified: boolean;
    rationale: string;
  }[];
  qualitative_evaluation_note?: string;
}
