import numpy as np
from typing import Dict, Any, Tuple, Optional
from sklearn.model_selection import train_test_split
from sklearn.linear_model import LogisticRegression
from sklearn.tree import DecisionTreeClassifier
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import accuracy_score, precision_score, recall_score, f1_score, roc_auc_score, confusion_matrix

try:
    from xgboost import XGBClassifier
    XGB_AVAILABLE = True
except ImportError:
    XGB_AVAILABLE = False

class ModelTrainer:
    def __init__(self, random_state: int = 42):
        self.random_state = random_state
        self.models: Dict[str, Any] = {}
        self.metrics: Dict[str, Dict[str, Any]] = {}
        self.best_model_name: Optional[str] = None
        self.train_test_data: Optional[Tuple[np.ndarray, np.ndarray, np.ndarray, np.ndarray]] = None

    def split_data(
        self,
        X: np.ndarray,
        y: np.ndarray,
        test_size: float = 0.20
    ) -> Tuple[np.ndarray, np.ndarray, np.ndarray, np.ndarray]:
        """Performs stratified split for classification."""
        try:
            X_train, X_test, y_train, y_test = train_test_split(
                X, y, test_size=test_size, random_state=self.random_state, stratify=y
            )
        except ValueError:
            # If a class has too few instances to stratify, fall back to non-stratified
            X_train, X_test, y_train, y_test = train_test_split(
                X, y, test_size=test_size, random_state=self.random_state
            )
        self.train_test_data = (X_train, X_test, y_train, y_test)
        return X_train, X_test, y_train, y_test

    def get_model_instance(self, model_key: str, n_classes: int) -> Any:
        if model_key == "logistic_regression":
            return LogisticRegression(
                max_iter=500,
                random_state=self.random_state,
                class_weight="balanced"
            )
        elif model_key == "decision_tree":
            return DecisionTreeClassifier(
                max_depth=6,
                min_samples_leaf=5,
                random_state=self.random_state
            )
        elif model_key == "random_forest":
            return RandomForestClassifier(
                n_estimators=50,
                max_depth=8,
                min_samples_leaf=3,
                random_state=self.random_state,
                n_jobs=1
            )
        elif model_key == "xgboost":
            if XGB_AVAILABLE:
                objective = "binary:logistic" if n_classes <= 2 else "multi:softprob"
                return XGBClassifier(
                    n_estimators=50,
                    max_depth=5,
                    learning_rate=0.1,
                    objective=objective,
                    random_state=self.random_state,
                    eval_metric="logloss" if n_classes <= 2 else "mlogloss",
                    verbosity=0,
                    n_jobs=1
                )
            else:
                # Fallback to Random Forest variant if XGBoost not installed
                return RandomForestClassifier(
                    n_estimators=50,
                    max_depth=6,
                    random_state=self.random_state,
                    n_jobs=1
                )
        else:
            raise ValueError(f"Unknown model identifier: {model_key}")

    def train_all(
        self,
        X_train: np.ndarray,
        X_test: np.ndarray,
        y_train: np.ndarray,
        y_test: np.ndarray,
        selected_models: Optional[list] = None
    ) -> Dict[str, Dict[str, Any]]:
        """Trains selected models and computes validation metrics."""
        if selected_models is None:
            selected_models = ["logistic_regression", "decision_tree", "random_forest", "xgboost"]
            
        n_classes = len(np.unique(y_train))
        average_mode = "binary" if n_classes <= 2 else "macro"
        
        best_f1 = -1.0
        
        for m_name in selected_models:
            model = self.get_model_instance(m_name, n_classes)
            model.fit(X_train, y_train)
            self.models[m_name] = model
            
            y_pred = model.predict(X_test)
            acc = float(accuracy_score(y_test, y_pred))
            prec = float(precision_score(y_test, y_pred, average=average_mode, zero_division=0))
            rec = float(recall_score(y_test, y_pred, average=average_mode, zero_division=0))
            f1 = float(f1_score(y_test, y_pred, average=average_mode, zero_division=0))
            cm = confusion_matrix(y_test, y_pred).tolist()
            
            roc_auc = None
            if hasattr(model, "predict_proba"):
                try:
                    y_prob = model.predict_proba(X_test)
                    if n_classes <= 2:
                        roc_auc = float(roc_auc_score(y_test, y_prob[:, 1]))
                    else:
                        roc_auc = float(roc_auc_score(y_test, y_prob, multi_class="ovr"))
                except Exception:
                    roc_auc = None
                    
            # Check model failure guard
            status = "HEALTHY"
            warning = None
            if f1 < 0.35 and acc < 0.5:
                status = "FAILED"
                warning = f"{m_name} performance is near or below random chance (F1={f1:.2f}). Reliability calculations on this model should be interpreted with extreme caution."
                
            self.metrics[m_name] = {
                "model_name": m_name,
                "accuracy": round(acc, 4),
                "precision": round(prec, 4),
                "recall": round(rec, 4),
                "f1": round(f1, 4),
                "roc_auc": round(roc_auc, 4) if roc_auc is not None else None,
                "confusion_matrix": cm,
                "status": status,
                "warning": warning
            }
            
            if f1 > best_f1:
                best_f1 = f1
                self.best_model_name = m_name
                
        return self.metrics
