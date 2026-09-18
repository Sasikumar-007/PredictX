# PredictX: AI-Powered Feature Importance Reliability Assessment

> **Explain Better. Decide Safer. Built for a More Trustworthy AI.**  
> *ML-T2-068 – Finding When Feature Importance Gives the Wrong Impression*

---

## 1. Problem Statement & Core Principle

Traditional Explainable AI (XAI) algorithms like **SHAP**, **Permutation Importance**, and **Gini Impurity** answer:
> *"Which features did the model assign high numerical attribution to?"*

**PredictX answers the critical question they leave open:**
> *"Can that feature importance explanation actually be trusted?"*

Standard feature importance techniques frequently deceive practitioners due to:
1. **Correlation & Multicollinearity**: When two features move together, explainers arbitrarily split or redistribute importance.
2. **Observational Proxy Relationships**: A benign feature can serve as a proxy for an unmeasured or sensitive attribute.
3. **Retraining Instability**: Minor perturbations in training data can cause feature rankings to swing drastically.
4. **Model Architecture Disagreement**: A feature ranked #1 by Random Forest may be ranked #10 by Logistic Regression or XGBoost.
5. **Subgroup Heterogeneity**: An explanation valid on the global population may completely invert on demographic sub-populations.
6. **Perturbation Inconsistency**: A feature may receive high SHAP importance yet shuffling or removing it produces negligible functional impact on model performance.

---

## 2. Architecture & High-Concurrency Design

PredictX is designed with a **direct-call, asynchronous job architecture** optimized for **free-tier hosting environments** (Render, Railway, HuggingFace Spaces) and capable of serving **30+ concurrent researchers** without out-of-memory errors or thread starvation.

```
USER (30+ Concurrent Sessions)
   |
   v
React 19 + Vite + TypeScript Frontend (Modal AI Dark Infrastructure Design)
   | REST API (Direct / Proxied)
   v
FastAPI High-Speed Backend Engine
   ├── In-Memory LRU Cache & Job Queue (Thread-Safe SQLite / Supabase PostgreSQL)
   ├── Data Preprocessing Engine (Missing Imputation, Target Encoding, Leakage Guards)
   ├── Model Training Engine (Logistic Regression, Decision Tree, Random Forest, XGBoost)
   ├── Unified Feature Importance (Adaptive SHAP, Permutation, Native Gini/Coefficients)
   └── PredictX Multi-Signal Reliability Engine
         ├── 1. Correlation & Multicollinearity Matrix (|r| >= 0.80, VIF > 10)
         ├── 2. Observational Proxy Risk Heuristics
         ├── 3. Bootstrap Retraining Stability (15 Iterations)
         ├── 4. Cross-Model Agreement Matrix (Spearman Rank Correlation)
         ├── 5. Subgroup Slice Heterogeneity Analysis
         └── 6. Perturbation Sensitivity Testing (Removal & Shuffle Delta F1)
               |
               v
   Combined Multi-Signal Reliability Score (0–100)
   Classification: RELIABLE | NEEDS REVIEW | POTENTIALLY MISLEADING
   Deterministic Plain-Language Explanations + Evidence Packet
   Automated PDF (ReportLab), CSV, & JSON Exporters
```

---

## 3. Reliability Scoring Formula

The PredictX Reliability Score is completely transparent and explainable:

$$\text{Reliability Score} = 100 - \sum_{i=1}^{6} \left( w_i \times \text{Risk}_i \times 100 \right)$$

### Default Research Weights:
- **Correlation Risk ($w_1 = 0.20$)**: Measures high pairwise Pearson/Spearman co-linearity and VIF redundancy.
- **Observational Proxy Risk ($w_2 = 0.15$)**: Measures predictive overlap with sensitive or correlated partners.
- **Retraining Instability ($w_3 = 0.20$)**: Evaluates rank standard deviation $\sigma_{\text{rank}}$ across bootstrap runs.
- **Cross-Model Disagreement ($w_4 = 0.15$)**: Evaluates rank variance and spread across linear and non-linear model families.
- **Subgroup Heterogeneity ($w_5 = 0.15$)**: Measures explanatory divergence across demographic strata.
- **Perturbation Inconsistency ($w_6 = 0.15$)**: Flags features with high attribution but low functional $\Delta\text{F1}$.

### Classification Cutoffs:
- **`80 – 100` $\rightarrow$ RELIABLE**: Explanation is stable, independent, and functional.
- **`50 – 79` $\rightarrow$ NEEDS REVIEW**: Moderate collinearity, rank shift, or model dependence.
- **`0 – 49` $\rightarrow$ POTENTIALLY MISLEADING**: High risk of false attribution or proxy bias.

---

## 4. Technology Stack

### Frontend:
- **React 19** + **TypeScript** + **Vite**
- **Tailwind CSS v4** configured with the **Modal AI Design System** (Dark technical infrastructure aesthetic, glowing specimen cards, high contrast status indicators)
- **Lucide React** for clean technical iconography
- **Recharts** for interactive reliability and stability distributions

### Backend:
- **Python 3.11** + **FastAPI** + **Uvicorn** + **Pydantic v2**
- **ML Core**: `scikit-learn`, `shap`, `xgboost`, `statsmodels`, `scipy`, `pandas`, `numpy`
- **Reporting**: `reportlab` (PDF generation), CSV & JSON export
- **Database**: Dual-tier: Thread-safe SQLite local database with automatic Supabase PostgreSQL sync when credentials are provided.

---

## 5. Getting Started & Running Locally

### Prerequisites
- Python 3.10+
- Node.js 18+ and npm

### 1. Backend Setup
```bash
# Navigate to project root
cd PredictX

# Install Python requirements
pip install -r backend/requirements.txt

# Start FastAPI server
python -m uvicorn backend.app.main:app --host 127.0.0.1 --port 8000 --reload
```
The backend will automatically start and warm up the instant student performance demo on `http://127.0.0.1:8000`.  
API documentation is available at `http://127.0.0.1:8000/docs`.

### 2. Frontend Setup
```bash
# In a separate terminal, navigate to frontend
cd PredictX/frontend

# Install dependencies
npm install

# Start Vite development server
npm run dev
```
Open `http://localhost:5173` in your browser.

---

## 6. Research Benchmarks & Controlled Ground Truth

PredictX provides two built-in evaluation scenarios:
1. **Student Performance Scenario (Instant Demo)**:
   - Evaluates features: `Study_Hours`, `Previous_Score`, `Learning_App_Usage`, `Attendance`, `Sleep_Hours`, `Internet_Access`, and `Noise_Feature`.
   - Demonstrates that while standard SHAP ranks `Learning_App_Usage` #1, PredictX correctly flags it as **POTENTIALLY MISLEADING** due to $r=0.91$ collinearity with `Study_Hours` and retraining instability.
2. **Synthetic Ground Truth Benchmark**:
   - Generates datasets with mathematically known roles: `TRUE_SIGNAL`, `CORRELATED`, `PROXY`, `REDUNDANT`, and `NOISE`.
   - Computes empirical **Precision**, **Recall**, and **F1** for reliability detection.

---

## 7. Running Backend Tests

```bash
python -m backend.tests.test_ml_pipeline
```
Verifies all 13 modules end-to-end: Preprocessing, Multi-Model Training, SHAP, Permutation Importance, Correlation, VIF, Proxy Risk, Stability, Agreement, Subgroup Slices, Perturbation, Reliability Scoring, and PDF Report generation.

---

## 8. License & Research Citation

Open-source under MIT.  
Developed as part of research on Explainable AI Reliability and Feature Attribution Diagnostics.
