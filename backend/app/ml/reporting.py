import io
import json
import csv
from datetime import datetime
from typing import Dict, Any, List
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, HRFlowable, KeepTogether

class ReportGenerator:
    def __init__(self, analysis_data: Dict[str, Any]):
        self.data = analysis_data

    def generate_json(self) -> str:
        """Returns JSON export string."""
        return json.dumps(self.data, indent=2, default=str)

    def generate_csv(self) -> str:
        """Returns CSV string of feature reliability scores and evidence."""
        output = io.StringIO()
        writer = csv.writer(output)
        
        # Headers
        writer.writerow([
            "Feature", "Importance", "Reliability_Score", "Classification",
            "Correlation_Risk", "Proxy_Risk", "Stability_Risk",
            "Model_Agreement_Risk", "Subgroup_Risk", "Perturbation_Risk",
            "Warnings", "Plain_Language_Explanation"
        ])
        
        evaluations = self.data.get("reliability_evaluations", [])
        for item in evaluations:
            signals = item.get("signals", {})
            warnings_str = " | ".join(item.get("warnings", []))
            writer.writerow([
                item.get("feature", ""),
                item.get("importance", 0.0),
                item.get("reliability_score", 0.0),
                item.get("classification", ""),
                signals.get("correlation_risk", 0.0),
                signals.get("proxy_risk", 0.0),
                signals.get("instability_risk", 0.0),
                signals.get("model_disagreement_risk", 0.0),
                signals.get("subgroup_variation_risk", 0.0),
                signals.get("perturbation_risk", 0.0),
                warnings_str,
                item.get("plain_language_explanation", "")
            ])
            
        return output.getvalue()

    def generate_pdf(self) -> bytes:
        """Builds a multi-page PDF research report."""
        buffer = io.BytesIO()
        doc = SimpleDocTemplate(
            buffer,
            pagesize=letter,
            rightMargin=36,
            leftMargin=36,
            topMargin=36,
            bottomMargin=36
        )
        
        styles = getSampleStyleSheet()
        
        # Custom styles
        title_style = ParagraphStyle(
            "DocTitle",
            parent=styles["Normal"],
            fontName="Helvetica-Bold",
            fontSize=22,
            leading=26,
            textColor=colors.HexColor("#181818")
        )
        subtitle_style = ParagraphStyle(
            "DocSubtitle",
            parent=styles["Normal"],
            fontName="Helvetica",
            fontSize=11,
            leading=15,
            textColor=colors.HexColor("#569846")
        )
        heading1 = ParagraphStyle(
            "Heading1_Custom",
            parent=styles["Heading1"],
            fontName="Helvetica-Bold",
            fontSize=14,
            leading=18,
            textColor=colors.HexColor("#242424"),
            spaceBefore=14,
            spaceAfter=6
        )
        body_style = ParagraphStyle(
            "Body_Custom",
            parent=styles["Normal"],
            fontName="Helvetica",
            fontSize=9,
            leading=13,
            textColor=colors.HexColor("#2f2f2f")
        )
        mono_style = ParagraphStyle(
            "Mono_Custom",
            parent=styles["Normal"],
            fontName="Courier",
            fontSize=8,
            leading=11,
            textColor=colors.HexColor("#464646")
        )
        callout_style = ParagraphStyle(
            "Callout",
            parent=styles["Normal"],
            fontName="Helvetica-Oblique",
            fontSize=9,
            leading=13,
            textColor=colors.HexColor("#222222")
        )
        
        story = []
        
        # 1. Header & Title
        story.append(Paragraph("PREDICTX: FEATURE IMPORTANCE RELIABILITY AUDIT", title_style))
        story.append(Paragraph("AI-Powered Explainable AI (XAI) Multi-Signal Diagnostic Report", subtitle_style))
        story.append(Spacer(1, 10))
        story.append(HRFlowable(width="100%", thickness=1.5, color=colors.HexColor("#6ac355"), spaceAfter=12))
        
        # Metadata bar
        dataset_name = self.data.get("dataset_name", "Dataset")
        timestamp = self.data.get("timestamp", datetime.utcnow().strftime("%Y-%m-%d %H:%M UTC"))
        best_model = self.data.get("best_model_name", "N/A")
        meta_text = f"<b>Dataset:</b> {dataset_name} &nbsp;|&nbsp; <b>Timestamp:</b> {timestamp} &nbsp;|&nbsp; <b>Best Model:</b> {best_model}"
        story.append(Paragraph(meta_text, body_style))
        story.append(Spacer(1, 12))
        
        # 2. Executive Summary
        story.append(Paragraph("1. Executive Summary", heading1))
        evals = self.data.get("reliability_evaluations", [])
        n_features = len(evals)
        n_reliable = sum(1 for e in evals if e.get("classification") == "RELIABLE")
        n_review = sum(1 for e in evals if e.get("classification") == "NEEDS_REVIEW")
        n_misleading = sum(1 for e in evals if e.get("classification") == "POTENTIALLY_MISLEADING")
        
        summary_text = (
            f"PredictX completed an automated multi-signal reliability audit of <b>{n_features} features</b>. "
            f"Of these, <b>{n_reliable}</b> features demonstrate high explanation stability and independence (RELIABLE), "
            f"<b>{n_review}</b> features require domain contextual review due to moderate collinearity or rank fluctuation (NEEDS REVIEW), and "
            f"<b>{n_misleading}</b> features receive elevated importance from standard explainers despite severe collinearity, proxy confounding, "
            f"or functional insignificance under perturbation (POTENTIALLY MISLEADING)."
        )
        story.append(Paragraph(summary_text, body_style))
        story.append(Spacer(1, 10))
        
        # Summary KPI Table
        kpi_data = [
            ["Reliability Classification", "Feature Count", "Percentage of Total", "Action Recommended"],
            ["RELIABLE (Score 80-100)", str(n_reliable), f"{(n_reliable/n_features*100):.1f}%" if n_features else "0%", "Safe to use for explanations and decision-making."],
            ["NEEDS REVIEW (Score 50-79)", str(n_review), f"{(n_review/n_features*100):.1f}%" if n_features else "0%", "Inspect correlation partners and stability runs."],
            ["POTENTIALLY MISLEADING (Score 0-49)", str(n_misleading), f"{(n_misleading/n_features*100):.1f}%" if n_features else "0%", "Do not treat explanation as causal; high risk of misattribution."]
        ]
        t_kpi = Table(kpi_data, colWidths=[150, 80, 100, 210])
        t_kpi.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor("#242424")),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 8),
            ('ALIGN', (1, 0), (2, -1), 'CENTER'),
            ('BACKGROUND', (0, 1), (-1, 1), colors.HexColor("#def0dd")),
            ('BACKGROUND', (0, 2), (-1, 2), colors.HexColor("#fff9db")),
            ('BACKGROUND', (0, 3), (-1, 3), colors.HexColor("#fce8e6")),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor("#bababa")),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ]))
        story.append(t_kpi)
        story.append(Spacer(1, 14))
        
        # 3. Model Performance Overview
        story.append(Paragraph("2. Model Training & Validation Performance", heading1))
        metrics = self.data.get("model_metrics", {})
        if metrics:
            m_rows = [["Model Architecture", "Accuracy", "Precision", "Recall", "F1 Score", "ROC-AUC", "Status"]]
            for m_key, m_val in metrics.items():
                m_rows.append([
                    m_val.get("model_name", m_key),
                    f"{m_val.get('accuracy', 0):.3f}",
                    f"{m_val.get('precision', 0):.3f}",
                    f"{m_val.get('recall', 0):.3f}",
                    f"{m_val.get('f1', 0):.3f}",
                    f"{m_val.get('roc_auc', 0):.3f}" if m_val.get('roc_auc') else "N/A",
                    m_val.get("status", "HEALTHY")
                ])
            t_models = Table(m_rows, colWidths=[140, 65, 65, 65, 65, 65, 75])
            t_models.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor("#242424")),
                ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
                ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                ('FONTSIZE', (0, 0), (-1, -1), 8),
                ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor("#bababa")),
                ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.HexColor("#ffffff"), colors.HexColor("#f8f9fa")]),
                ('ALIGN', (1, 0), (-1, -1), 'CENTER'),
            ]))
            story.append(t_models)
        story.append(Spacer(1, 14))
        
        # 4. Feature Reliability Scores Table
        story.append(Paragraph("3. Feature Importance & Reliability Scorecard", heading1))
        f_rows = [["Rank", "Feature", "Importance", "Score", "Classification", "Key Risk Signal", "Primary Warning"]]
        for item in evals:
            feat_name = item.get("feature", "")
            imp = item.get("importance", 0.0)
            score = item.get("reliability_score", 0.0)
            cls = item.get("classification", "")
            warnings = item.get("warnings", [])
            primary_w = warnings[0] if warnings else "None detected"
            
            # Key risk signal determination
            sigs = item.get("signals", {})
            top_sig = max(sigs.items(), key=lambda x: x[1]) if sigs else ("none", 0)
            sig_label = f"{top_sig[0].replace('_risk', '').title()} ({top_sig[1]:.2f})"
            
            f_rows.append([
                str(item.get("evidence", {}).get("unified_rank", "-")),
                feat_name[:20],
                f"{imp:.3f}",
                f"{score:.1f}",
                cls.replace("_", " "),
                sig_label,
                primary_w[:50] + ("..." if len(primary_w) > 50 else "")
            ])
            
        t_feats = Table(f_rows, colWidths=[35, 95, 60, 45, 90, 85, 130])
        t_feats.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor("#242424")),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 7.5),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor("#bababa")),
            ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor("#f8f9fa")]),
            ('ALIGN', (0, 0), (0, -1), 'CENTER'),
            ('ALIGN', (2, 0), (3, -1), 'CENTER'),
        ]))
        story.append(t_feats)
        story.append(Spacer(1, 14))
        
        # 5. Plain Language Detail Explanations
        story.append(Paragraph("4. Evidence-Based Plain Language Diagnostics", heading1))
        for item in evals[:6]:  # Include detailed breakdown for top/notable features
            f_title = f"<b>{item.get('feature')}</b> — Reliability Score: {item.get('reliability_score')}/100 ({item.get('classification')})"
            story.append(Paragraph(f_title, body_style))
            story.append(Paragraph(item.get("plain_language_explanation", ""), callout_style))
            story.append(Spacer(1, 6))
            
        story.append(Spacer(1, 10))
        
        # 6. Research Limitations & Methodology
        story.append(Paragraph("5. Research Methodology & Scientific Limitations", heading1))
        limits_text = (
            "<b>Important Methodological Context:</b><br/>"
            "• <i>No Universal Ground Truth:</i> On empirical observational datasets, 'true feature importance' is mathematically unidentifiable. "
            "PredictX computes multi-signal sensitivity, collinearity, and stability diagnostics relative to the chosen data distribution and model class.<br/>"
            "• <i>Correlation vs. Causation:</i> Collinearity and proxy metrics diagnose statistical co-movement and shared predictive variance; "
            "they do NOT establish or disprove underlying causal pathways without explicit causal DAG assumptions.<br/>"
            "• <i>Model Agreement:</i> Divergent importance across linear and non-linear model architectures indicates model-dependent representations "
            "rather than intrinsic feature invalidity.<br/>"
            "• <i>Thresholds:</i> The 80/50 scoring thresholds and default weights are configurable research baselines."
        )
        story.append(Paragraph(limits_text, body_style))
        story.append(Spacer(1, 14))
        
        doc.build(story)
        return buffer.getvalue()
