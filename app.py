import streamlit as st
import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
from sklearn.model_selection import train_test_split
from sklearn.linear_model import LinearRegression
from sklearn import metrics

# -------------------------------
# Title and Sidebar
# -------------------------------
st.set_page_config(layout="wide")
st.title("📈 Stock Price Prediction App")
st.sidebar.title("Options")

# -------------------------------
# Upload CSV File
# -------------------------------
uploaded_file = st.file_uploader("Upload CSV file with stock data", type=["csv"])

if uploaded_file:
    dataset = pd.read_csv(uploaded_file)
    dataset['date'] = pd.to_datetime(dataset['date'])
    dataset.dropna(inplace=True)

    st.subheader("📊 Raw Data")
    st.dataframe(dataset.head(10))

    # -------------------------------
    # Model Training
    # -------------------------------
    st.subheader("🔧 Train Linear Regression Model")
    x = dataset[['open', 'high', 'low', 'volume']]
    y = dataset['close']

    x_train, x_test, y_train, y_test = train_test_split(x, y, random_state=0)
    model = LinearRegression()
    model.fit(x_train, y_train)
    predicted = model.predict(x_test)

    mae_lr = metrics.mean_absolute_error(y_test, predicted)
    st.success(f"✅ Model Trained | MAE: {mae_lr:.2f}")

    # -------------------------------
    # Heuristic Prediction
    # -------------------------------
    dataset['prev_close'] = dataset.groupby('Name')['close'].shift(1)
    dataset['avg_volume'] = dataset.groupby('Name')['volume'].transform('mean')
    dataset['heuristic_prediction'] = np.where(
        (dataset['open'] > dataset['prev_close']) & (dataset['volume'] > dataset['avg_volume']),
        dataset['open'] * 1.01,
        dataset['open'] * 0.99
    )
    mae_heuristic = metrics.mean_absolute_error(dataset['close'].dropna(), dataset['heuristic_prediction'].dropna())

    # -------------------------------
    # FOL Prediction
    # -------------------------------
    dataset['FOL_prediction'] = np.where(
        (dataset['high'] > dataset['open']) & (dataset['low'] < dataset['open']),
        (dataset['high'] + dataset['low']) / 2,
        dataset['open']
    )
    mae_fol = metrics.mean_absolute_error(dataset['close'], dataset['FOL_prediction'])

    # -------------------------------
    # CSP Prediction
    # -------------------------------
    def csp_prediction(row):
        predicted = (row['high'] + row['low']) / 2
        lower = row['open'] * 0.95
        upper = row['open'] * 1.05
        return np.clip(predicted, lower, upper)

    dataset['CSP_prediction'] = dataset.apply(csp_prediction, axis=1)
    mae_csp = metrics.mean_absolute_error(dataset['close'], dataset['CSP_prediction'])

    # -------------------------------
    # Results and Visualization
    # -------------------------------
    st.subheader("📉 MAE Comparison Chart")

    mae_dict = {
        "Linear Regression": mae_lr,
        "Heuristic": mae_heuristic,
        "FOL Rule": mae_fol,
        "CSP Rule": mae_csp
    }

    fig, ax = plt.subplots()
    ax.bar(mae_dict.keys(), mae_dict.values(), color=['blue', 'green', 'orange', 'red'])
    ax.set_ylabel('Mean Absolute Error')
    ax.set_title('Model vs Heuristic MAE Comparison')
    st.pyplot(fig)

    # -------------------------------
    # Show Predictions
    # -------------------------------
    st.subheader("📋 Sample Predictions")
    result_df = pd.DataFrame({
        'Actual': dataset['close'],
        'Linear Regression': model.predict(x),
        'Heuristic': dataset['heuristic_prediction'],
        'FOL': dataset['FOL_prediction'],
        'CSP': dataset['CSP_prediction']
    }).dropna()

    st.dataframe(result_df.head(20))

else:
    st.warning("👆 Please upload a stock CSV file to get started.")

