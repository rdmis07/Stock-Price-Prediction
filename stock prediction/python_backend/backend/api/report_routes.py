"""PDF / CSV export endpoints."""
from __future__ import annotations

import csv
import io
from datetime import datetime

from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse

from backend.ml.predict import ensemble_forecast
from backend.utils.auth import get_current_user
from backend.utils.data_fetcher import fetch_history

router = APIRouter()


@router.get("/{symbol}/csv")
def export_csv(symbol: str, exchange: str = "NASDAQ", _user=Depends(get_current_user)):
    df = fetch_history(symbol, exchange=exchange, period="2y")
    buf = io.StringIO()
    df.to_csv(buf, index=False)
    buf.seek(0)
    return StreamingResponse(
        iter([buf.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={symbol}_history.csv"},
    )


@router.get("/{symbol}/predictions/csv")
def export_predictions_csv(symbol: str, horizon: int = 30,
                            exchange: str = "NASDAQ", _user=Depends(get_current_user)):
    result = ensemble_forecast(symbol, exchange=exchange, horizon=horizon)
    buf = io.StringIO()
    writer = csv.writer(buf)
    writer.writerow(["day", "ensemble", *result["models"].keys()])
    for i in range(horizon):
        row = [i + 1, result["ensemble"][i] if i < len(result["ensemble"]) else ""]
        for m in result["models"].values():
            row.append(m[i] if i < len(m) else "")
        writer.writerow(row)
    buf.seek(0)
    return StreamingResponse(
        iter([buf.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={symbol}_predictions.csv"},
    )


@router.get("/{symbol}/pdf")
def export_pdf(symbol: str, exchange: str = "NASDAQ", _user=Depends(get_current_user)):
    """
    Generate a PDF prediction report using reportlab.
    (Add `reportlab` to requirements.txt to enable.)
    """
    try:
        from reportlab.lib.pagesizes import A4
        from reportlab.lib.styles import getSampleStyleSheet
        from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
        from reportlab.lib import colors
    except ImportError:
        return {"detail": "Install reportlab to enable PDF export"}

    result = ensemble_forecast(symbol, exchange=exchange, horizon=30)
    buf = io.BytesIO()
    doc = SimpleDocTemplate(buf, pagesize=A4)
    styles = getSampleStyleSheet()
    flow = [
        Paragraph(f"<b>QuantumStock AI Prediction Report — {symbol}</b>", styles["Title"]),
        Paragraph(f"Generated {datetime.utcnow().isoformat()}Z", styles["Normal"]),
        Spacer(1, 12),
        Paragraph(f"Last close: ${result['last_close']:.2f}", styles["Normal"]),
        Paragraph(f"7-day ensemble forecast: ${result['ensemble'][6]:.2f}", styles["Normal"]),
        Paragraph(f"30-day ensemble forecast: ${result['ensemble'][29]:.2f}", styles["Normal"]),
        Spacer(1, 18),
    ]
    table_data = [["Model", "MAE", "RMSE", "R²"]]
    for name, m in result.get("metrics", {}).items():
        table_data.append([name, f"{m.get('MAE',0):.3f}", f"{m.get('RMSE',0):.3f}", f"{m.get('R2',0):.3f}"])
    t = Table(table_data)
    t.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#1a2138")),
        ("TEXTCOLOR",  (0, 0), (-1, 0), colors.white),
        ("FONTNAME",   (0, 0), (-1, 0), "Helvetica-Bold"),
        ("GRID",       (0, 0), (-1, -1), 0.5, colors.grey),
    ]))
    flow.append(t)
    doc.build(flow)
    buf.seek(0)
    return StreamingResponse(buf, media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename={symbol}_report.pdf"})
