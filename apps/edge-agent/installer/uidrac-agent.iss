; Inno Setup — Conzex UiDRAC Agent Windows setup.exe
; Build on Windows: iscc apps/edge-agent/installer/uidrac-agent.iss
; Requires: uidrac-agent.exe, nssm.exe, install.ps1, uninstall.ps1 in ..\windows\

#define MyAppName "Conzex UiDRAC Agent"
#define MyAppVersion "1.2.0"
#define MyAppPublisher "Conzex Global Private Limited"
#define MyAppURL "https://uidrac.cloud.conzex.com"
#define MyAppSupport "info@conzex.com"
#define MyAppCopyright "Copyright (C) 2026 Conzex Global Private Limited"

[Setup]
AppId={{A7B8C9D0-E1F2-3456-7890-UIDRACAGENT1}
AppName={#MyAppName}
AppVersion={#MyAppVersion}
AppVerName={#MyAppName} {#MyAppVersion}
AppPublisher={#MyAppPublisher}
AppPublisherURL={#MyAppURL}
AppSupportURL={#MyAppSupport}
AppUpdatesURL={#MyAppURL}
AppCopyright={#MyAppCopyright}
DefaultDirName={autopf}\Conzex\UiDRAC Agent
DefaultGroupName=Conzex UiDRAC Agent
DisableProgramGroupPage=yes
LicenseFile=legal\CONZEX-EULA.txt
InfoBeforeFile=legal\COPYRIGHT.txt
OutputDir=out
OutputBaseFilename=UidracAgentSetup
Compression=lzma2
SolidCompression=yes
WizardStyle=modern
PrivilegesRequired=admin
ArchitecturesInstallIn64BitMode=x64compatible

[Languages]
Name: "english"; MessagesFile: "compiler:Default.isl"

[Files]
Source: "..\windows\agent-bundle.cjs"; DestDir: "{app}"; Flags: ignoreversion
Source: "..\windows\run-uidrac-agent.cmd"; DestDir: "{app}"; Flags: ignoreversion
Source: "..\windows\uidrac-agent.exe"; DestDir: "{app}"; Flags: ignoreversion skipifsourcedoesntexist
Source: "..\windows\nssm.exe"; DestDir: "{app}"; Flags: ignoreversion
Source: "..\windows\install.ps1"; DestDir: "{app}"; Flags: ignoreversion
Source: "..\windows\uninstall.ps1"; DestDir: "{app}"; Flags: ignoreversion
Source: "legal\CONZEX-EULA.txt"; DestDir: "{app}"; Flags: ignoreversion
Source: "legal\COPYRIGHT.txt"; DestDir: "{app}"; Flags: ignoreversion
Source: "..\console\public\*"; DestDir: "{app}\console\public"; Flags: ignoreversion recursesubdirs

[Icons]
Name: "{group}\Open Agent Console"; Filename: "http://127.0.0.1:9742"
Name: "{group}\Configure UiDRAC Agent (README)"; Filename: "{app}\COPYRIGHT.txt"
Name: "{group}\Uninstall {#MyAppName}"; Filename: "{app}\uninstall.ps1"

[Run]
Filename: "{app}\install.ps1"; Parameters: "-Config ""{code:GetConfigPath}"""; Flags: runhidden waituntilterminated; Description: "Register Windows service (requires agent JSON)"; Check: ConfigProvided

[Code]
var
  ConfigPage: TInputFileWizardPage;

procedure InitializeWizard;
begin
  ConfigPage := CreateInputFilePage(wpSelectDir,
    'Agent credentials', 'Select your uidrac-agent-win.json from the cloud portal',
    'Download the JSON from Universal iDRAC Console → Settings → Agent download → Windows.');
  ConfigPage.Add('Agent JSON bundle:', 'JSON files|*.json|All files|*.*', 'json');
end;

function ConfigProvided: Boolean;
begin
  Result := ConfigPage.Values[0] <> '';
end;

function GetConfigPath(Param: String): String;
begin
  Result := ConfigPage.Values[0];
end;

function NextButtonClick(CurPageID: Integer): Boolean;
begin
  Result := True;
  if CurPageID = ConfigPage.ID then
    if ConfigPage.Values[0] = '' then
      MsgBox('Select your agent JSON file, or click Next after placing it manually and run install.ps1 later.', mbInformation, MB_OK);
end;
