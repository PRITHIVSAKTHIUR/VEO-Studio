# **VEO-Studio**

> VEO-Studio is an advanced AI-powered video generation web app built on the Google Gemini API and the cutting-edge Veo model, enabling users to create high-quality videos from text prompts, reference images, or both — all within an intuitive and responsive interface. It offers powerful customization options like aspect ratio and video count, real-time progress updates, and automatic polling for long-running operations, while gracefully handling errors such as rate limits or missing models. With built-in video previews, one-click downloads, and seamless image-to-video support, VEO-Studio delivers a complete end-to-end solution for generating and managing AI-generated videos with ease.

https://github.com/user-attachments/assets/49a56dac-c2f8-4862-9647-80c2674acf5d

https://github.com/user-attachments/assets/e06db1b1-7f8b-4e7c-afea-d19e3eb5aa8e


# Gemini App Proxy Server

This nodejs proxy server lets you run your AI Studio Gemini application unmodified, without exposing your API key in the frontend code.


## Instructions

**Prerequisites**:
- [Google Cloud SDK / gcloud CLI](https://cloud.google.com/sdk/docs/install)
- (Optional) Gemini API Key

1. Download or copy the files of your AI Studio app into this directory at the root level.
2. If your app calls the Gemini API, create a Secret for your API key:
     ```
     echo -n "${GEMINI_API_KEY}" | gcloud secrets create gemini_api_key --data-file=-
     ```

3.  Deploy to Cloud Run (optionally including API key):
    ```
    gcloud run deploy my-app --source=. --update-secrets=GEMINI_API_KEY=gemini_api_key:latest
    ```
