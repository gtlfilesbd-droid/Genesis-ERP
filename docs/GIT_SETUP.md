# Git Installation Guide for Windows

## Step 1: Download Git for Windows

1. Visit the official Git download page: **https://git-scm.com/download/win**
2. The download should start automatically. If not, click the download button.
3. The installer file will be named something like `Git-2.xx.x-64-bit.exe`

## Step 2: Install Git

1. **Run the installer** (you may need administrator privileges)
2. **Follow the installation wizard:**
   - **Select Components**: Keep the default selections (recommended)
   - **Choosing the default editor**: Select your preferred text editor (Notepad++ is fine, or stick with Vim/Nano)
   - **Adjusting PATH environment**: 
     - Select **"Git from the command line and also from 3rd-party software"** (RECOMMENDED)
     - This adds Git to your system PATH automatically
   - **Choosing HTTPS transport backend**: Use the default "Use the OpenSSL library"
   - **Configuring line ending conversions**: 
     - Select **"Checkout Windows-style, commit Unix-style line endings"** (RECOMMENDED)
   - **Configuring terminal emulator**: Use default "Use MinTTY"
   - **Default behavior of `git pull`**: Use default
   - **Credential helper**: Use default
   - **Extra options**: Keep defaults
   - **Experimental options**: You can skip these
3. Click **"Install"** and wait for the installation to complete
4. Click **"Finish"** when done

## Step 3: Verify Installation

1. **Close and reopen** your PowerShell/Command Prompt window (or restart your terminal)
2. Run this command to verify Git is installed:

```powershell
git --version
```

You should see output like: `git version 2.xx.x.windows.x`

If you see this, Git is installed correctly!

## Step 4: Configure Git (First Time Only)

After installation, you need to set your name and email:

```powershell
git config --global user.name "Your Name"
git config --global user.email "your.email@example.com"
```

Replace with your actual name and email address.

## Step 5: Verify PATH (If Git Command Not Found)

If after installation, PowerShell still says "git is not recognized", try:

1. **Close all terminal windows completely**
2. **Restart your computer** (sometimes needed for PATH changes to take effect)
3. Open PowerShell again and try `git --version`

If it still doesn't work:

1. Find where Git was installed (usually `C:\Program Files\Git\cmd`)
2. Add it to your PATH manually:
   - Right-click "This PC" → Properties
   - Click "Advanced system settings"
   - Click "Environment Variables"
   - Under "System variables", find "Path" and click "Edit"
   - Click "New" and add: `C:\Program Files\Git\cmd`
   - Click "OK" on all dialogs
   - Restart PowerShell

## Troubleshooting

### "git is not recognized"
- Make sure you closed and reopened PowerShell after installation
- Restart your computer
- Verify Git is in your PATH (see Step 5 above)

### Permission Denied Errors
- Run PowerShell as Administrator (Right-click → Run as administrator)

### Need Help?
- Git documentation: https://git-scm.com/doc
- GitHub help: https://help.github.com

---

**Once Git is installed and verified, you can run the `PUSH_TO_GITHUB.ps1` script to push your project to GitHub!**

