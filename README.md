# Home and Me

Source code backup of the **Home and Me** website — an ASP.NET Web Forms (C# / .NET Framework) e-commerce and room-customizer application.

## What's included
- `.aspx` / `.aspx.cs` pages and code-behind
- `Admin/` admin panel source
- `App_Code/`, `Controls/`, `assets/`, `ckeditor/`, etc.

## What's excluded (see `.gitignore`)
- `Web.config` — contains database connection strings and secrets
- `Bin/` and `*.dll` — compiled output
- `UploadedFiles/`, `ExtractedFiles/`, `DownloadFiles/`, `App_Data/` — uploaded media / data (~900 MB+)

## Running locally
This is a server-rendered ASP.NET app. It cannot be opened as static HTML.
To run it you need:
- Windows + IIS / IIS Express (or Visual Studio)
- .NET Framework
- A SQL Server database (connection strings live in `Web.config`)
- Payment gateway config (Stripe / PayPal)
