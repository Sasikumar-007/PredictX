from typing import Dict, List, Any, Optional
from ..config import settings

class PredictXReliabilityAnalyzer:
    def __init__(
        self,
        weights: Optional[Dict[str, float]] = None,
        threshold_reliable: float = 80.0,
        threshold_needs_review: float = 50.0
    ):
        self.weights = weights or settings.DEFAULT_WEIGHTS
        # Ensure weights sum to 1.0
        total_w = sum(self.weights.values())
        if total_w > 0:
            self.weights = {k: v / total_w for k, v in self.weights.items()}
            
        self.threshold_reliable = threshold_reliable
        self.threshold_needs_review = threshold_needs_review

    def analyze(
        self,
        feature_names: List[str],
        unified_importances: List[Dict[str, Any]],
        correlation_results: Dict[str, Any],
        vif_results: List[Dict[str, Any]],
        proxy_results: List[Dict[str, Any]],
        stability_results: List[Dict[str, Any]],
        agreement_results: Dict[str, Any],
        subgroup_results: List[Dict[str, Any]],
        perturbation_results: List[Dict[str, Any]]
    ) -> List[Dict[str, Any]]:
        """
        Combines all 6 reliability signals into a transparent, multi-signal score (0-100),
        assigns a classification (RELIABLE, NEEDS_REVIEW, POTENTIALLY_MISLEADING),
        and generates deterministic plain-language explanations with full numerical evidence.
        """
        # Index lookups
        imp_map = {item["feature"]: item for item in unified_importances}
        vif_map = {item["feature"]: item for item in vif_results}
        proxy_map = {item["feature"]: item for item in proxy_results}
        stability_map = {item["feature"]: item for item in stability_results}
        
        feat_agreements = agreement_results.get("feature_agreements", [])
        agreement_map = {item["feature"]: item for item in feat_agreements}
        
        subgroup_map = {item["feature"]: item for item in subgroup_results}
        perturb_map = {item["feature"]: item for item in perturbation_results}
        corr_max_map = correlation_results.get("feature_max_corr", {})
        corr_partners_map = correlation_results.get("feature_corr_partners", {})

        evaluations = []

        for feat in feature_names:
            imp_info = imp_map.get(feat, {"consensus_importance": 0.0, "shap_importance": 0.0, "unified_rank": 99})
            importance_val = imp_info.get("consensus_importance", 0.0)
            shap_val = imp_info.get("shap_importance", 0.0)
            rank_val = imp_info.get("unified_rank", 1)

            # --- Signal 1: Correlation Risk (0.0 to 1.0) ---
            max_r = corr_max_map.get(feat, 0.0)
            # Risk scales non-linearly above 0.70
            if max_r >= 0.90:
                corr_risk = 1.0
            elif max_r >= 0.80:
                corr_risk = 0.75 + (max_r - 0.80) * 2.5
            elif max_r >= 0.60:
                corr_risk = (max_r - 0.60) * 1.5
            else:
                corr_risk = 0.0

            # --- Signal 2: Proxy Risk (0.0 to 1.0) ---
            proxy_info = proxy_map.get(feat, {"proxy_score": 0.0, "associated_feature": None})
            proxy_risk = float(proxy_info.get("proxy_score", 0.0))

            # --- Signal 3: Instability Risk (0.0 to 1.0) ---
            stab_info = stability_map.get(feat, {"stability_score": 100.0, "rank_std": 0.0, "top_5_frequency": 100.0})
            stab_score = float(stab_info.get("stability_score", 100.0))
            instability_risk = max(0.0, min(1.0, (100.0 - stab_score) / 100.0))

            # --- Signal 4: Model Disagreement Risk (0.0 to 1.0) ---
            agree_info = agreement_map.get(feat, {"agreement_score": 100.0, "rank_spread": 0})
            agree_score = float(agree_info.get("agreement_score", 100.0))
            disagreement_risk = max(0.0, min(1.0, (100.0 - agree_score) / 100.0))

            # --- Signal 5: Subgroup Variation Risk (0.0 to 1.0) ---
            sub_info = subgroup_map.get(feat, {"variation_score": 0.0, "is_valid": False})
            subgroup_risk = float(sub_info.get("variation_score", 0.0)) if sub_info.get("is_valid", False) else 0.0

            # --- Signal 6: Perturbation Inconsistency Risk (0.0 to 1.0) ---
            pert_info = perturb_map.get(feat, {"f1_delta": 0.05, "functional_impact": "STRONG"})
            f1_drop = float(pert_info.get("f1_delta", 0.05))
            func_impact = pert_info.get("functional_impact", "STRONG")
            
            # If high importance but zero functional drop -> high risk
            if func_impact == "INCONSISTENT":
                perturb_risk = 0.90
            elif importance_val >= 0.10 and f1_drop < 0.01:
                perturb_risk = 0.70
            elif f1_drop < 0.02:
                perturb_risk = 0.35
            else:
                perturb_risk = 0.0

            # --- Deductions calculation (100 - weighted risks) ---
            deductions = {
                "correlation": round(corr_risk * self.weights.get("correlation", 0.20) * 100.0, 1),
                "proxy": round(proxy_risk * self.weights.get("proxy", 0.15) * 100.0, 1),
                "stability": round(instability_risk * self.weights.get("stability", 0.20) * 100.0, 1),
                "model_agreement": round(disagreement_risk * self.weights.get("model_agreement", 0.15) * 100.0, 1),
                "subgroup": round(subgroup_risk * self.weights.get("subgroup", 0.15) * 100.0, 1),
                "perturbation": round(perturb_risk * self.weights.get("perturbation", 0.15) * 100.0, 1),
            }

            total_deduction = sum(deductions.values())
            raw_score = max(0.0, min(100.0, 100.0 - total_deduction))
            final_score = round(raw_score, 1)

            # --- Classification ---
            if final_score >= self.threshold_reliable:
                classification = "RELIABLE"
            elif final_score >= self.threshold_needs_review:
                classification = "NEEDS_REVIEW"
            else:
                classification = "POTENTIALLY_MISLEADING"

            # --- Warnings Generation from actual evidence ---
            warnings = []
            if corr_risk >= 0.70:
                partner_names = [p["partner"] for p in corr_partners_map.get(feat, [])[:2]]
                partner_str = f" with '{', '.join(partner_names)}'" if partner_names else ""
                warnings.append(f"High collinearity ({max_r:.2f}){partner_str}. Importance may be split or inflated.")
            
            vif_item = vif_map.get(feat, {})
            if vif_item.get("risk_level") == "HIGH":
                warnings.append(f"High multicollinearity (VIF: {vif_item.get('vif', 0):.1f}). Feature is largely redundant with combinations of others.")

            if proxy_risk >= 0.70:
                warnings.append(f"High observational proxy risk ({proxy_info.get('association_type')}).")

            if instability_risk >= 0.50:
                warnings.append(f"Importance is unstable across resampled retraining runs (rank std: ±{stab_info.get('rank_std', 0):.1f}).")

            if disagreement_risk >= 0.50:
                warnings.append(f"Model disagreement: ranking fluctuates widely across model architectures (rank spread: {agree_info.get('rank_spread', 0)}).")

            if subgroup_risk >= 0.40:
                warnings.append(f"Subgroup disparity: importance varies significantly across slices of '{sub_info.get('subgroup_feature')}'.")

            if perturb_risk >= 0.60:
                warnings.append("Perturbation mismatch: high explanation importance but minimal functional impact on model F1.")

            # --- Plain-Language Deterministic Explanation ---
            if classification == "RELIABLE":
                explanation = (
                    f"'{feat}' is classified as RELIABLE (Score: {final_score}/100). "
                    f"It ranks #{rank_val} with consensus importance of {importance_val:.3f}. "
                    f"It exhibits low correlation with other features (max |r|={max_r:.2f}), stable ranking across bootstrap retrainings "
                    f"(±{stab_info.get('rank_std', 0):.1f} rank std), consistent agreement across model families, "
                    f"and strong functional performance degradation upon perturbation (ΔF1={f1_drop:.3f})."
                )
            elif classification == "NEEDS_REVIEW":
                explanation = (
                    f"'{feat}' requires review before treating its explanation as conclusive (Score: {final_score}/100). "
                    f"While it holds notable importance ({importance_val:.3f}), "
                    + (f"it exhibits moderate collinearity (|r|={max_r:.2f}). " if corr_risk > 0.3 else "")
                    + (f"its ranking fluctuates by ±{stab_info.get('rank_std', 0):.1f} ranks during retraining. " if instability_risk > 0.3 else "")
                    + (f"different model architectures disagree on its importance. " if disagreement_risk > 0.3 else "")
                    + "PredictX advises checking domain context and collinearity partners."
                )
            else:
                top_concern = warnings[0] if warnings else "Multiple compounding reliability flags detected."
                explanation = (
                    f"'{feat}' is flagged as POTENTIALLY MISLEADING (Score: {final_score}/100). "
                    f"Despite receiving an apparent importance score of {importance_val:.3f} (SHAP={shap_val:.3f}), "
                    f"the explanation cannot be reliably trusted: {top_concern} "
                    f"Decisions based solely on this feature's explanation risk misattributing true predictive cause."
                )

            evidence_packet = {
                "consensus_importance": importance_val,
                "shap_importance": shap_val,
                "unified_rank": rank_val,
                "max_correlation": max_r,
                "vif": vif_item.get("vif", 1.0),
                "proxy_score": proxy_risk,
                "associated_proxy_feature": proxy_info.get("associated_feature"),
                "rank_std": stab_info.get("rank_std", 0.0),
                "top_5_frequency": stab_info.get("top_5_frequency", 100.0),
                "model_rank_spread": agree_info.get("rank_spread", 0),
                "subgroup_variation_score": subgroup_risk,
                "perturbation_f1_delta": f1_drop,
                "functional_impact": func_impact
            }

            evaluations.append({
                "feature": feat,
                "importance": importance_val,
                "reliability_score": final_score,
                "classification": classification,
                "signals": {
                    "correlation_risk": round(corr_risk, 3),
                    "proxy_risk": round(proxy_risk, 3),
                    "instability_risk": round(instability_risk, 3),
                    "model_disagreement_risk": round(disagreement_risk, 3),
                    "subgroup_variation_risk": round(subgroup_risk, 3),
                    "perturbation_risk": round(perturb_risk, 3),
                },
                "score_calculation": deductions,
                "evidence": evidence_packet,
                "warnings": warnings,
                "plain_language_explanation": explanation
            })

        evaluations.sort(key=lambda x: x["reliability_score"])
        return evaluations
