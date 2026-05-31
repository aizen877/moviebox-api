"""Deploy this folder to a HuggingFace Docker Space using the provided token."""

import os
import sys

from huggingface_hub import HfApi

TOKEN = os.environ["HF_TOKEN"]
SPACE_NAME = "moviebox-v2-api"

api = HfApi(token=TOKEN)

who = api.whoami()
username = who["name"]
repo_id = f"{username}/{SPACE_NAME}"
print(f"Authenticated as: {username}")
print(f"Target Space: {repo_id}")

# Create the Docker space (idempotent)
api.create_repo(
    repo_id=repo_id,
    repo_type="space",
    space_sdk="docker",
    exist_ok=True,
    private=False,
)
print("Space repo ready.")

# Upload the deployable files
here = os.path.dirname(os.path.abspath(__file__))
api.upload_folder(
    folder_path=here,
    repo_id=repo_id,
    repo_type="space",
    allow_patterns=["app.py", "requirements.txt", "Dockerfile", "README.md", ".gitignore"],
    commit_message="Deploy Moviebox v2 API",
)
print("Upload complete.")
print(f"Space URL:  https://huggingface.co/spaces/{repo_id}")
print(f"Live API:   https://{username.lower()}-{SPACE_NAME}.hf.space")
