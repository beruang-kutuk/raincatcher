from __future__ import annotations

from flask import Flask, jsonify, request
from flask_cors import CORS

from ai_recommendation.ai_recommendation_forecast import forecast_ai_recommendation
from benchmark.benchmark_forecast import forecast_benchmark
from common.schemas import FORECAST_ENDPOINTS
from monthly_harvest.monthly_harvest_forecast import forecast_monthly_harvest
from risk.risk_forecast import forecast_risk
from tank_storage.tank_storage_forecast import forecast_tank_storage
from usable_water.usable_water_forecast import forecast_usable_water
from weekly_harvest.weekly_harvest_forecast import forecast_weekly_harvest
from what_if_scenario.what_if_scenario_forecast import forecast_what_if_scenario

app = Flask(__name__)
CORS(app)


def get_payload() -> dict:
    return request.get_json(silent=True) or {}


@app.get("/")
def index():
    return jsonify(
        {
            "service": "Raincatcher Forecast ML Baseline API",
            "status": "ready",
            "port": 5051,
            "endpoints": FORECAST_ENDPOINTS,
        }
    )


@app.post("/api/forecast/benchmark")
def benchmark():
    return jsonify(forecast_benchmark(get_payload()))


@app.post("/api/forecast/monthly-harvest")
def monthly_harvest():
    return jsonify(forecast_monthly_harvest(get_payload()))


@app.post("/api/forecast/risk")
def risk():
    return jsonify(forecast_risk(get_payload()))


@app.post("/api/forecast/tank-storage")
def tank_storage():
    return jsonify(forecast_tank_storage(get_payload()))


@app.post("/api/forecast/usable-water")
def usable_water():
    return jsonify(forecast_usable_water(get_payload()))


@app.post("/api/forecast/weekly-harvest")
def weekly_harvest():
    return jsonify(forecast_weekly_harvest(get_payload()))


@app.post("/api/forecast/what-if-scenario")
def what_if_scenario():
    return jsonify(forecast_what_if_scenario(get_payload()))


@app.post("/api/forecast/ai-recommendation")
def ai_recommendation():
    return jsonify(forecast_ai_recommendation(get_payload()))


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5051, debug=True)
