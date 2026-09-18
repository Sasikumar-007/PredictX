import asyncio
from backend.app.api.endpoints import run_instant_demo
from backend.app.database.db import db
from backend.app.ml.reporting import ReportGenerator

async def main():
    res = await run_instant_demo()
    assert res.success == True
    data = res.data
    assert data['analysis_id'] == 'demo_student_perf'
    assert len(data['reliability_evaluations']) > 0
    print('Demo analysis generated successfully!')
    print('Best Model:', data['best_model_name'])
    for e in data['reliability_evaluations']:
        print(f"Feature: {e['feature']:<22} Score: {e['reliability_score']:<5} Class: {e['classification']:<22} Warnings: {len(e['warnings'])}")
    
    rep = ReportGenerator(data)
    pdf = rep.generate_pdf()
    print(f"PDF Report generated: {len(pdf)} bytes")
    csv_out = rep.generate_csv()
    print(f"CSV lines: {len(csv_out.splitlines())}")

if __name__ == "__main__":
    asyncio.run(main())
