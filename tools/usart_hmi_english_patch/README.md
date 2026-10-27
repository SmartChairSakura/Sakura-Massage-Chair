# USART HMI (Taojingchi / TJC) 1-Click English Translation Patch

> **Plug-and-Play English Translation for Taojingchi USART HMI Editor (`USART HMI.exe`)**  
> *No manual reverse engineering or dnSpy editing required — everything is pre-compiled, pre-patched, and ready for 1-click deployment.*

---

## 🎯 What is This?
**USART HMI** is the official visual GUI editor for **Taojingchi (TJC)** touchscreen displays (e.g. `TJC4880X243_011`). Because the software is developed for the Chinese domestic market, it is released exclusively in Chinese with no official language switch.

This tool provides an **automated 1-click English localization patch** that translates all menus, component toolboxes, attributes panels, font generators, and error dialogs into English.

---

## 🚀 How to Use (1-Click Installation)

1. Clone or download this repository.
2. Navigate to: `tools/usart_hmi_english_patch/`
3. **Double-click `install.bat`** (or right-click `install.bat` -> *Run as administrator*).
4. Click **Yes** on the Windows UAC confirmation dialog.
5. The installer will automatically:
   - Detect your USART HMI installation folder (`C:\Program Files (x86)\Nextion Editor` or `C:\Program Files (x86)\USART HMI`).
   - Safely close any running instances.
   - Install the translation dictionary to `C:\devel\hmi_translation.txt`.
   - Backup your original `ACTR.dll` to `backup_original/`.
   - Copy all 21 pre-patched assemblies (including the modified `hmitype.dll`).
6. Launch **`USART HMI.exe`** — the interface is now 100% in English!

---

## 📁 Package Contents

```
tools/usart_hmi_english_patch/
├── install.bat             # 1-Click launcher with automatic UAC elevation
├── install.ps1             # Intelligent PowerShell installation script
├── hmi_translation.txt     # English translation dictionary
├── README.md               # Documentation & usage guide
└── dlls/                   # Pre-patched, decrypted runtime assemblies (21 DLLs)
    ├── hmitype.dll         # Pre-patched with dynamic language hook
    ├── achmiface.dll
    ├── DevComponents.DotNetBar2.dll
    ├── HMIFORM.dll
    ├── TFTEDIT.dll
    └── ... (16 more DLLs)
```

---

## 🔧 How It Works (Technical Architecture)

1. **Internal Architecture:**  
   `USART HMI.exe` is a 32-bit .NET application that normally decrypts its UI assemblies from `ACTR.dll` into memory using `AppDllPass.dll`.
2. **Reverse-Engineered Hook:**  
   Every string in the UI is routed through `hmitype.LanguageApp.Language(this string text)`.
3. **Dynamic Translation Engine:**  
   The patched `hmitype.dll` intercepts every string call and checks against `C:\devel\hmi_translation.txt`. Any translated string is immediately returned in English; untranslated strings are appended to `C:\devel\hmi.log` for continuous dictionary expansion.
4. **Assembly Precedence:**  
   When loose DLLs exist in the application folder (`BaseDirectory`), the .NET runtime loads them in priority over the embedded `ACTR.dll` archive.

---

## 📝 Customizing / Adding Translations
You can easily add or edit translations by editing `C:\devel\hmi_translation.txt`:
```
[Chinese Text]<TAB>[English Translation]
```
No restart of USART HMI is required; translations reload dynamically.
