import json
import matplotlib.pyplot as plt
import numpy as np
import pandas as pd
from ml.config import DATA_PATH, ARTIFACTS_DIR, PLOTS_DIR
from ml.features import engineer_features

def run_eda():
    df = pd.read_csv(DATA_PATH)
    df_feat = engineer_features(df)
    
    total_records = len(df)
    churn_count = int(df['Exited'].sum())
    retained_count = total_records - churn_count
    churn_rate = float(df['Exited'].mean())
    
    # 1. Summary statistics
    summary = {
        "dataset_shape": list(df.shape),
        "total_records": total_records,
        "churn_count": churn_count,
        "retained_count": retained_count,
        "churn_rate": round(churn_rate, 4),
        "columns": list(df.columns),
        "null_counts": {k: int(v) for k, v in df.isnull().sum().to_dict().items()},
        "duplicates": int(df.duplicated().sum())
    }
    
    # 2. Breakdowns
    segments = {}
    breakdown_cols = ['Geography', 'Gender', 'age_group', 'NumOfProducts', 'IsActiveMember', 'credit_band', 'is_zero_balance']
    for col in breakdown_cols:
        grouped = df_feat.groupby(col).agg(
            total=('Exited', 'count'),
            churned=('Exited', 'sum'),
            churn_rate=('Exited', 'mean')
        ).reset_index()
        
        segments[col] = [
            {
                "category": str(row[col]),
                "total": int(row['total']),
                "churned": int(row['churned']),
                "churn_rate": round(float(row['churn_rate']), 4)
            }
            for _, row in grouped.iterrows()
        ]
    
    summary["segments"] = segments
    
    # Financial metrics by churn
    fin_stats = df.groupby('Exited').agg(
        avg_balance=('Balance', 'mean'),
        median_balance=('Balance', 'median'),
        avg_salary=('EstimatedSalary', 'mean'),
        avg_credit_score=('CreditScore', 'mean'),
        avg_age=('Age', 'mean')
    ).reset_index().to_dict(orient='records')
    summary["financial_by_churn"] = fin_stats
    
    # Save eda_summary.json
    out_file = ARTIFACTS_DIR / "eda_summary.json"
    with open(out_file, "w", encoding="utf-8") as f:
        json.dump(summary, f, indent=2)
    print(f"Saved EDA summary to {out_file}")
    
    # 3. Generate high-quality PNG plots
    plt.style.use('seaborn-v0_8-whitegrid' if 'seaborn-v0_8-whitegrid' in plt.style.available else 'default')
    fig, axes = plt.subplots(2, 2, figsize=(14, 10))
    fig.patch.set_facecolor('#FFFFFF')
    
    # Chart 1: Churn by Geography
    geo_df = pd.DataFrame(segments['Geography'])
    ax1 = axes[0, 0]
    bars1 = ax1.bar(geo_df['category'], geo_df['churn_rate'] * 100, color=['#4F46E5', '#EF4444', '#10B981'], width=0.5)
    ax1.set_title('Churn Rate by Geography (%)', fontsize=12, fontweight='bold', pad=10)
    ax1.set_ylabel('Churn Rate (%)')
    ax1.set_ylim(0, 45)
    for bar in bars1:
        yval = bar.get_height()
        ax1.text(bar.get_x() + bar.get_width()/2.0, yval + 1, f"{yval:.1f}%", ha='center', va='bottom', fontsize=10, fontweight='bold')
    
    # Chart 2: Churn by Number of Products
    prod_df = pd.DataFrame(segments['NumOfProducts'])
    ax2 = axes[0, 1]
    bars2 = ax2.bar(prod_df['category'].astype(str), prod_df['churn_rate'] * 100, color='#6366F1', width=0.5)
    ax2.set_title('Churn Rate by NumOfProducts (%)', fontsize=12, fontweight='bold', pad=10)
    ax2.set_ylabel('Churn Rate (%)')
    ax2.set_ylim(0, 105)
    for bar in bars2:
        yval = bar.get_height()
        ax2.text(bar.get_x() + bar.get_width()/2.0, yval + 1.5, f"{yval:.1f}%", ha='center', va='bottom', fontsize=10, fontweight='bold')
    
    # Chart 3: Churn by Age Group
    age_df = pd.DataFrame(segments['age_group'])
    order = ['<30', '30-40', '40-50', '50-60', '60+']
    age_df['sort_order'] = age_df['category'].map({k: i for i, k in enumerate(order)})
    age_df = age_df.sort_values('sort_order')
    ax3 = axes[1, 0]
    bars3 = ax3.bar(age_df['category'], age_df['churn_rate'] * 100, color='#F59E0B', width=0.5)
    ax3.set_title('Churn Rate by Age Group (%)', fontsize=12, fontweight='bold', pad=10)
    ax3.set_ylabel('Churn Rate (%)')
    ax3.set_ylim(0, 65)
    for bar in bars3:
        yval = bar.get_height()
        ax3.text(bar.get_x() + bar.get_width()/2.0, yval + 1, f"{yval:.1f}%", ha='center', va='bottom', fontsize=10, fontweight='bold')
    
    # Chart 4: Active Member vs Inactive Churn
    act_df = pd.DataFrame(segments['IsActiveMember'])
    act_df['label'] = act_df['category'].map({'0': 'Inactive Member', '1': 'Active Member'})
    ax4 = axes[1, 1]
    bars4 = ax4.bar(act_df['label'], act_df['churn_rate'] * 100, color=['#EF4444', '#10B981'], width=0.45)
    ax4.set_title('Churn Rate by Activity Status (%)', fontsize=12, fontweight='bold', pad=10)
    ax4.set_ylabel('Churn Rate (%)')
    ax4.set_ylim(0, 35)
    for bar in bars4:
        yval = bar.get_height()
        ax4.text(bar.get_x() + bar.get_width()/2.0, yval + 0.8, f"{yval:.1f}%", ha='center', va='bottom', fontsize=10, fontweight='bold')
    
    plt.tight_layout()
    plot_path = PLOTS_DIR / 'eda_churn_segments.png'
    fig.savefig(plot_path, dpi=200, bbox_inches='tight')
    plt.close(fig)
    print(f"Saved EDA plot to {plot_path}")
    return summary

if __name__ == '__main__':
    run_eda()
