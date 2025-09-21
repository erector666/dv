# 🤗 Hugging Face CLI Setup

This project now includes the Hugging Face CLI for easy interaction with Hugging Face models, datasets, and repositories.

## 🚀 Quick Start

### Using the Batch File (Recommended)
```bash
# Show help
.\hf.bat

# Log in to Hugging Face
.\hf.bat login

# Check current user
.\hf.bat whoami

# Download a model
.\hf.bat download microsoft/DialoGPT-medium

# Upload files
.\hf.bat upload ./my-model --repo username/my-model
```

### Using the CLI Directly
```bash
# Log in to Hugging Face
hf login

# Check current user
hf whoami

# Download a model
hf download microsoft/DialoGPT-medium

# Upload files
hf upload ./my-model --repo username/my-model
```

## 📋 Common Commands

### Authentication
- `hf login` - Log in using a token from [huggingface.co/settings/tokens](https://huggingface.co/settings/tokens)
- `hf whoami` - Check which account you're logged in as
- `hf logout` - Log out

### Repository Management
- `hf repo create my-repo` - Create a new repository
- `hf repo create my-repo --type model` - Create a model repository
- `hf repo create my-repo --type dataset` - Create a dataset repository

### Downloading
- `hf download microsoft/DialoGPT-medium` - Download a model
- `hf download microsoft/DialoGPT-medium --local-dir ./models/dialogpt` - Download to specific directory
- `hf download microsoft/DialoGPT-medium --include "*.json"` - Download only specific files

### Uploading
- `hf upload ./my-model --repo username/my-model` - Upload a folder
- `hf upload ./config.json --repo username/my-model` - Upload a single file
- `hf upload ./my-model --repo username/my-model --private` - Upload as private

### Cache Management
- `hf scan-cache` - Scan cache directory
- `hf delete-cache` - Delete revisions from cache

## 🔧 Environment Information

The CLI is installed with the following configuration:
- **Version**: 0.35.0
- **Python**: 3.12.10
- **Platform**: Windows
- **Cache Directory**: `C:\Users\kango\.cache\huggingface\hub`
- **Token Path**: `C:\Users\kango\.cache\huggingface\token`
- **Current User**: erector666
- **Token Name**: DV (FINEGRAINED permissions)
- **Status**: ✅ Authenticated and Ready

## 📚 Useful Resources

- [Hugging Face Hub Documentation](https://huggingface.co/docs/huggingface_hub)
- [Model Hub](https://huggingface.co/models)
- [Dataset Hub](https://huggingface.co/datasets)
- [Spaces Hub](https://huggingface.co/spaces)

## 🛠️ Troubleshooting

### PATH Issues
If you get "command not found" errors, make sure the Python Scripts directory is in your PATH:
```bash
# Add to PATH temporarily
$env:PATH += ";C:\Users\kango\AppData\Local\Programs\Python\Python312\Scripts"

# Or use the full path
& "C:\Users\kango\AppData\Local\Programs\Python\Python312\Scripts\hf.exe" --help
```

### Authentication Issues
1. Get a token from [huggingface.co/settings/tokens](https://huggingface.co/settings/tokens)
2. Run `hf auth login --token YOUR_TOKEN` to authenticate
3. Verify with `hf auth whoami`

### Cache Issues
- Clear cache: `hf delete-cache`
- Check cache: `hf scan-cache`
- Set custom cache directory: `$env:HF_HUB_CACHE="C:\my\custom\cache"`

## 🎯 Example Workflows

### Download a Model for Local Use
```bash
# Download a popular model
hf download microsoft/DialoGPT-medium --local-dir ./models/dialogpt

# Download only specific files
hf download microsoft/DialoGPT-medium --include "*.json" --local-dir ./models/dialogpt-config
```

### Upload Your Own Model
```bash
# Create a new model repository
hf repo create my-awesome-model --type model

# Upload your model files
hf upload ./my-model-files --repo username/my-awesome-model

# Make it private
hf upload ./my-model-files --repo username/my-awesome-model --private
```

### Work with Datasets
```bash
# Download a dataset
hf download huggingface/CodeBERTa --repo-type dataset

# Upload your own dataset
hf repo create my-dataset --type dataset
hf upload ./my-data --repo username/my-dataset
```

---

**Ready to start using Hugging Face models and datasets! 🚀**
