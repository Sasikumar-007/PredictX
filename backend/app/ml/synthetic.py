import numpy as np
import pandas as pd
from typing import Dict, List, Any, Tuple

class SyntheticDataGenerator:
    def __init__(self, random_state: int = 42):
        self.random_state = random_state

    def generate_research_dataset(
        self,
        n_rows: int = 1000,
        noise_level: float = 0.15
    ) -> Tuple[pd.DataFrame, Dict[str, str]]:
        """
        Generates controlled synthetic research dataset with known ground-truth roles.
        """
        rng = np.random.RandomState(self.random_state)
        
        # 1. True signals
        true_signal_1 = rng.normal(loc=10.0, scale=3.0, size=n_rows)
        true_signal_2 = rng.normal(loc=50.0, scale=12.0, size=n_rows)
        
        # 2. Correlated signal (r ~ 0.91 with true_signal_1)
        correlated_signal = 0.90 * true_signal_1 + rng.normal(loc=0.0, scale=1.0, size=n_rows)
        
        # 3. Proxy feature (encodes demographic subgroup + proxy relationship)
        demographic_group = rng.choice([0, 1], size=n_rows, p=[0.5, 0.5])
        proxy_feature = 0.6 * true_signal_2 + 4.0 * demographic_group + rng.normal(0, 2.0, n_rows)
        
        # 4. Redundant feature (combination of 1 and 2)
        redundant_feature = 0.5 * true_signal_1 + 0.3 * true_signal_2 + rng.normal(0, 1.0, n_rows)
        
        # 5. Noise features
        noise_1 = rng.normal(loc=0.0, scale=5.0, size=n_rows)
        noise_2 = rng.uniform(low=0.0, high=100.0, size=n_rows)
        noise_3 = rng.exponential(scale=2.0, size=n_rows)
        
        # Latent log-odds formula
        # True equation only depends on true_signal_1 and true_signal_2!
        z = (0.7 * (true_signal_1 - 10.0) / 3.0) + (0.9 * (true_signal_2 - 50.0) / 12.0) + rng.normal(0, noise_level, n_rows)
        prob = 1.0 / (1.0 + np.exp(-z))
        target = (prob >= 0.5).astype(int)
        
        df = pd.DataFrame({
            "true_signal_1": np.round(true_signal_1, 2),
            "true_signal_2": np.round(true_signal_2, 2),
            "correlated_signal": np.round(correlated_signal, 2),
            "proxy_feature": np.round(proxy_feature, 2),
            "redundant_feature": np.round(redundant_feature, 2),
            "demographic_slice": demographic_group,
            "noise_gaussian": np.round(noise_1, 2),
            "noise_uniform": np.round(noise_2, 2),
            "noise_exponential": np.round(noise_3, 2),
            "target": target
        })
        
        ground_truth = {
            "true_signal_1": "TRUE_SIGNAL",
            "true_signal_2": "TRUE_SIGNAL",
            "correlated_signal": "CORRELATED",
            "proxy_feature": "PROXY",
            "redundant_feature": "REDUNDANT",
            "demographic_slice": "SUBGROUP_ATTRIBUTE",
            "noise_gaussian": "NOISE",
            "noise_uniform": "NOISE",
            "noise_exponential": "NOISE"
        }
        
        return df, ground_truth

    def generate_student_demo(self, n_rows: int = 1000) -> Tuple[pd.DataFrame, Dict[str, str]]:
        """
        Creates the student performance classification demo scenario.
        """
        rng = np.random.RandomState(self.random_state)
        
        # Study hours (genuine predictor)
        study_hours = np.clip(rng.normal(loc=18.0, scale=6.0, size=n_rows), 2.0, 45.0)
        # Previous exam score (genuine predictor)
        previous_score = np.clip(rng.normal(loc=72.0, scale=12.0, size=n_rows), 30.0, 99.0)
        # Learning app usage (heavily correlated with study hours, r=0.91)
        learning_app = np.clip(0.88 * study_hours + rng.normal(loc=2.0, scale=2.5, size=n_rows), 0.0, 50.0)
        # Attendance %
        attendance = np.clip(rng.normal(loc=85.0, scale=10.0, size=n_rows), 40.0, 100.0)
        # Sleep hours
        sleep_hours = np.clip(rng.normal(loc=7.0, scale=1.2, size=n_rows), 4.0, 10.0)
        # Subgroup: Access to high-speed internet (0 or 1)
        internet_access = rng.choice([0, 1], size=n_rows, p=[0.35, 0.65])
        # Random noise feature
        random_survey_id = rng.uniform(10.0, 99.0, size=n_rows)
        
        # True outcome depends on study hours, previous score, attendance
        z = (0.08 * (study_hours - 18.0)) + (0.06 * (previous_score - 72.0)) + (0.04 * (attendance - 85.0)) + rng.normal(0, 0.4, n_rows)
        prob = 1.0 / (1.0 + np.exp(-z))
        performance_category = np.where(prob >= 0.5, "Pass", "Fail")
        
        df = pd.DataFrame({
            "Study_Hours": np.round(study_hours, 1),
            "Previous_Score": np.round(previous_score, 1),
            "Learning_App_Usage": np.round(learning_app, 1),
            "Attendance": np.round(attendance, 1),
            "Sleep_Hours": np.round(sleep_hours, 1),
            "Internet_Access": internet_access,
            "Noise_Feature": np.round(random_survey_id, 1),
            "Performance_Category": performance_category
        })
        
        ground_truth = {
            "Study_Hours": "TRUE_SIGNAL",
            "Previous_Score": "TRUE_SIGNAL",
            "Learning_App_Usage": "CORRELATED",
            "Attendance": "TRUE_SIGNAL",
            "Sleep_Hours": "WEAK_SIGNAL",
            "Internet_Access": "SUBGROUP_ATTRIBUTE",
            "Noise_Feature": "NOISE"
        }
        
        return df, ground_truth

    def evaluate_ground_truth(
        self,
        ground_truth: Dict[str, str],
        predictx_evaluations: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """
        Calculates Precision, Recall, F1, and Accuracy for synthetic evaluation.
        Criteria:
        - TRUE_SIGNAL should be classified as RELIABLE
        - CORRELATED, PROXY, REDUNDANT, NOISE should be flagged (NEEDS_REVIEW or POTENTIALLY_MISLEADING)
        """
        eval_map = {item["feature"]: item for item in predictx_evaluations}
        
        y_true_binary = []  # 1 = Needs Review / Misleading, 0 = Reliable
        y_pred_binary = []
        details = []
        
        for feat, role in ground_truth.items():
            if feat not in eval_map:
                continue
            item = eval_map[feat]
            classification = item["classification"]
            score = item["reliability_score"]
            imp = item["importance"]
            
            # Ground truth expectation:
            # TRUE_SIGNAL -> Should be Reliable (binary 0 for risk)
            # CORRELATED, PROXY, REDUNDANT, NOISE -> Has risk (binary 1 for risk)
            is_risk_expected = (role in ["CORRELATED", "PROXY", "REDUNDANT", "NOISE"])
            is_risk_detected = (classification in ["NEEDS_REVIEW", "POTENTIALLY_MISLEADING"])
            
            is_correct = (is_risk_expected == is_risk_detected)
            
            y_true_binary.append(1 if is_risk_expected else 0)
            y_pred_binary.append(1 if is_risk_detected else 0)
            
            rationale = (
                f"Ground truth role '{role}'. PredictX assigned score {score} ({classification}). "
                + ("Correctly identified reliability state." if is_correct else "Misaligned classification.")
            )
            
            details.append({
                "feature_name": feat,
                "ground_truth_role": role,
                "importance": imp,
                "predictx_reliability_score": score,
                "predictx_classification": classification,
                "is_correctly_classified": is_correct,
                "rationale": rationale
            })
            
        # Metric computations
        tp = sum(1 for yt, yp in zip(y_true_binary, y_pred_binary) if yt == 1 and yp == 1)
        fp = sum(1 for yt, yp in zip(y_true_binary, y_pred_binary) if yt == 0 and yp == 1)
        fn = sum(1 for yt, yp in zip(y_true_binary, y_pred_binary) if yt == 1 and yp == 0)
        tn = sum(1 for yt, yp in zip(y_true_binary, y_pred_binary) if yt == 0 and yp == 0)
        
        precision = tp / (tp + fp) if (tp + fp) > 0 else 1.0
        recall = tp / (tp + fn) if (tp + fn) > 0 else 1.0
        f1 = (2 * precision * recall) / (precision + recall) if (precision + recall) > 0 else 0.0
        accuracy = (tp + tn) / len(y_true_binary) if y_true_binary else 1.0
        
        return {
            "precision": round(precision, 3),
            "recall": round(recall, 3),
            "f1": round(f1, 3),
            "accuracy": round(accuracy, 3),
            "feature_evaluations": details,
            "qualitative_evaluation_note": (
                "Synthetic evaluation calculates empirical Precision, Recall, and F1 because ground-truth "
                "data-generating relationships are explicitly known. For real-world datasets, true importance "
                "cannot be observed, so PredictX presents qualitative plausibility and sensitivity diagnostics instead."
            )
        }
