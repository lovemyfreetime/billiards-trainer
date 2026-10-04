#define MyAppName "Billiards Trainer AI Edition 4.12"
#define MyAppExeName "BilliardsTrainer.Windows.exe"

[Setup]
AppId={{E0932BE2-51CE-4DD2-8F90-3EB4C27FA412}
AppName={#MyAppName}
AppVersion=4.12
AppPublisher=Billiards Trainer
DefaultDirName={localappdata}\Programs\Billiards Trainer AI
DefaultGroupName=Billiards Trainer AI
DisableProgramGroupPage=yes
PrivilegesRequired=lowest
OutputDir=output
OutputBaseFilename=Billiards-Trainer-Windows-Setup
SetupIconFile=assets\billiards-trainer.ico
UninstallDisplayIcon={app}\{#MyAppExeName}
Compression=lzma2
SolidCompression=yes
WizardStyle=modern
ArchitecturesAllowed=x64compatible
ArchitecturesInstallIn64BitMode=x64compatible
CloseApplications=yes
RestartApplications=no

[Files]
Source: "publish\*"; DestDir: "{app}"; Flags: ignoreversion recursesubdirs createallsubdirs
Source: "assets\MicrosoftEdgeWebview2Setup.exe"; DestDir: "{tmp}"; Flags: deleteafterinstall

[Icons]
Name: "{autoprograms}\Billiards Trainer AI Edition 4.12"; Filename: "{app}\{#MyAppExeName}"
Name: "{autodesktop}\Billiards Trainer AI Edition 4.12"; Filename: "{app}\{#MyAppExeName}"

[Run]
Filename: "{tmp}\MicrosoftEdgeWebview2Setup.exe"; Parameters: "/silent /install"; StatusMsg: "Preparing the Billiards Trainer display engine..."; Flags: waituntilterminated skipifdoesntexist
Filename: "{app}\{#MyAppExeName}"; Description: "Launch Billiards Trainer AI Edition 4.12"; Flags: nowait postinstall skipifsilent

[UninstallDelete]
Type: filesandordirs; Name: "{localappdata}\Billiards Trainer AI\WebView2"
