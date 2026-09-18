# Standalone ML pipeline test
# pyrefly: ignore [missing-import]
import numpy as np
import pandas as pd
from backend.app.ml.preprocessing import DataPreprocessor
from backend.app.ml.training import ModelTrainer
from backend.app.ml.importance import FeatureImportanceEngine
from backend.app.ml.correlation import CorrelationAnalyzer
from backend.app.ml.vif import VIFAnalyzer
from backend.app.ml.proxy import ProxyRiskAnalyzer
from backend.app.ml.stability import StabilityAnalyzer
from backend.app.ml.agreement import ModelAgreementAnalyzer
from backend.app.ml.subgroup import SubgroupAnalyzer
from backend.app.ml.perturbation import PerturbationAnalyzer
from backend.app.ml.reliability import PredictXReliabilityAnalyzer
from backend.app.ml.synthetic import SyntheticDataGenerator
from backend.app.ml.reporting import ReportGenerator

def test_full_ml_and_reliability_pipeline():
    # 1. Generate synthetic dataset
    generator = SyntheticDataGenerator(random_state=42)
    df, ground_truth = generator.generate_research_dataset(n_rows=250)
    assert len(df) == 250
    assert "target" in df.columns
    assert ground_truth["true_signal_1"] == "TRUE_SIGNAL"
    assert ground_truth["correlated_signal"] == "CORRELATED"

    # 2. Preprocessing
    preprocessor = DataPreprocessor()
    X, y, feature_names, summary = preprocessor.preprocess(df, target_col="target")
    assert X.shape[0] == 250
    assert len(feature_names) == X.shape[1]
    assert len(np.unique(y)) == 2

    # 3. Model Training
    trainer = ModelTrainer(random_state=42)
    X_train, X_test, y_train, y_test = trainer.split_data(X, y)
    metrics = trainer.train_all(X_train, X_test, y_train, y_test, selected_models=["logistic_regression", "random_forest"])
    assert "random_forest" in metrics
    assert metrics["random_forest"]["accuracy"] > 0.60

    # 4. Feature Importance
    best_model = trainer.models["random_forest"]
    imp_engine = FeatureImportanceEngine(random_state=42)
    unified_table = imp_engine.generate_unified_table(best_model, X_train, X_test, y_test, feature_names)
    assert len(unified_table) == len(feature_names)
    assert unified_table[0]["unified_rank"] == 1

    # 5. Correlation & VIF
    corr_analyzer = CorrelationAnalyzer(threshold=0.80)
    corr_results = corr_analyzer.analyze(X, feature_names)
    assert len(corr_results["high_risk_pairs"]) > 0  # true_signal_1 and correlated_signal must be flagged!

    vif_analyzer = VIFAnalyzer()
    vif_results = vif_analyzer.calculate_vif(X, feature_names)
    assert len(vif_results) == len(feature_names)

    # 6. Proxy Risk
    proxy_analyzer = ProxyRiskAnalyzer()
    proxy_results = proxy_analyzer.analyze(X, feature_names, corr_results)
    assert len(proxy_results) == len(feature_names)

    # 7. Stability Analysis
    stab_analyzer = StabilityAnalyzer(n_runs=5, random_state=42)
    stability_results = stab_analyzer.analyze(best_model, X_train, y_train, feature_names)
    assert len(stability_results) == len(feature_names)

    # 8. Model Agreement
    agree_analyzer = ModelAgreementAnalyzer()
    agreement_results = agree_analyzer.analyze(trainer.models, feature_names)
    assert len(agreement_results["feature_agreements"]) == len(feature_names)

    # 9. Subgroup Analysis
    sub_analyzer = SubgroupAnalyzer()
    X_df = pd.DataFrame(X, columns=feature_names)
    subgroup_results = sub_analyzer.analyze(best_model, X_df, y, subgroup_col="demographic_slice")
    assert len(subgroup_results) == len(feature_names)

    # 10. Perturbation Analysis
    pert_analyzer = PerturbationAnalyzer(random_state=42)
    unified_dict = {item["feature"]: item["consensus_importance"] for item in unified_table}
    perturb_results = pert_analyzer.analyze(best_model, X_test, y_test, feature_names, unified_dict)
    assert len(perturb_results) == len(feature_names)

    # 11. Master Reliability Score
    rel_analyzer = PredictXReliabilityAnalyzer()
    evaluations = rel_analyzer.analyze(
        feature_names=feature_names,
        unified_importances=unified_table,
        correlation_results=corr_results,
        vif_results=vif_results,
        proxy_results=proxy_results,
        stability_results=stability_results,
        agreement_results=agreement_results,
        subgroup_results=subgroup_results,
        perturbation_results=perturb_results
    )
    assert len(evaluations) == len(feature_names)
    for item in evaluations:
        assert 0.0 <= item["reliability_score"] <= 100.0
        assert item["classification"] in ["RELIABLE", "NEEDS_REVIEW", "POTENTIALLY_MISLEADING"]
        assert len(item["plain_language_explanation"]) > 20

    # 12. Synthetic Evaluation Metrics
    eval_summary = generator.evaluate_ground_truth(ground_truth, evaluations)
    assert eval_summary["precision"] >= 0.50
    assert eval_summary["recall"] >= 0.50

    # 13. Reporting
    test_data = {
        "dataset_name": "Test Synthetic Dataset",
        "best_model_name": "Random Forest",
        "reliability_evaluations": evaluations,
        "model_metrics": metrics
    }
    reporter = ReportGenerator(test_data)
    pdf_bytes = reporter.generate_pdf()
    assert len(pdf_bytes) > 1000
    csv_str = reporter.generate_csv()
    assert "Feature,Importance" in csv_str
    json_str = reporter.generate_json()
    assert "reliability_evaluations" in json_str

    print("All ML and Reliability Engine unit tests passed successfully!")

if __name__ == "__main__":
    test_full_ml_and_reliability_pipeline()
