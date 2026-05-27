# 📓 Notebook 02 — Feature Engineering

```python
import sys; sys.path.append("..")
from backend.utils.data_fetcher import fetch_history
from backend.ml.features import add_indicators, build_xy

df = fetch_history("AAPL", "NASDAQ", "3y")
feat = add_indicators(df).dropna()
feat.tail()
```

```python
# Visualize indicator coverage
import matplotlib.pyplot as plt

fig, axes = plt.subplots(3, 1, figsize=(14, 9), sharex=True)
axes[0].plot(feat["date"], feat["close"], label="Close", color="#5eead4")
axes[0].plot(feat["date"], feat["ema_12"], label="EMA12", color="#818cf8")
axes[0].plot(feat["date"], feat["ema_26"], label="EMA26", color="#fbbf24")
axes[0].fill_between(feat["date"], feat["bb_lower"], feat["bb_upper"],
                     color="#5eead4", alpha=.1, label="BB")
axes[0].legend(); axes[0].set_title("Price + Indicators")
axes[1].plot(feat["date"], feat["rsi_14"], color="#f472b6"); axes[1].axhline(70, ls="--", c="r")
axes[1].axhline(30, ls="--", c="g"); axes[1].set_title("RSI 14")
axes[2].bar(feat["date"], feat["macd_hist"], color="#34d399"); axes[2].set_title("MACD Histogram")
plt.tight_layout(); plt.show()
```

```python
# Build supervised dataset
X, y, cols = build_xy(df, target_shift=1)
print("Shape:", X.shape, "  Features:", len(cols))
```
