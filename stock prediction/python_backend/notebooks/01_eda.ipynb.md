# 📓 Notebook 01 — Exploratory Data Analysis

> Convert this `.md` to `.ipynb` with `jupytext --to ipynb 01_eda.ipynb.md`

```python
import yfinance as yf
import pandas as pd
import matplotlib.pyplot as plt
import seaborn as sns
sns.set_theme(style="darkgrid")

df = yf.download("AAPL", period="5y", auto_adjust=True)
df.columns = df.columns.get_level_values(0)
df.head()
```

```python
# Price + volume
fig, axes = plt.subplots(2, 1, figsize=(14, 8), sharex=True,
                         gridspec_kw={"height_ratios": [3, 1]})
axes[0].plot(df.index, df["Close"], color="#5eead4")
axes[0].set_title("AAPL Close Price (5y)"); axes[0].grid(alpha=.3)
axes[1].bar(df.index, df["Volume"], color="#818cf8", alpha=.6)
axes[1].set_title("Volume")
plt.tight_layout(); plt.show()
```

```python
# Returns distribution
returns = df["Close"].pct_change().dropna()
print("Annualized vol:", returns.std() * (252 ** 0.5))
print("Sharpe (rf=0):", returns.mean()/returns.std() * (252 ** 0.5))
sns.histplot(returns, bins=80, kde=True); plt.show()
```

```python
# Correlation heatmap of OHLCV
sns.heatmap(df[["Open","High","Low","Close","Volume"]].corr(),
            annot=True, cmap="mako"); plt.show()
```
