# 📓 Notebook 03 — Model Comparison & Backtesting

```python
import sys; sys.path.append("..")
from backend.ml.train import train_all
import json, pandas as pd

metrics = train_all("AAPL", exchange="NASDAQ", period="5y")
pd.DataFrame(metrics).T.round(3)
```

```python
# Plot comparison
import matplotlib.pyplot as plt
df = pd.DataFrame(metrics).T
fig, axes = plt.subplots(1, 2, figsize=(14, 4))
df["R2"].sort_values().plot.barh(ax=axes[0], color="#5eead4")
axes[0].set_title("R² Score by Model")
df["RMSE"].sort_values(ascending=False).plot.barh(ax=axes[1], color="#f472b6")
axes[1].set_title("RMSE by Model (lower is better)")
plt.tight_layout(); plt.show()
```
