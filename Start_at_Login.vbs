Set WshShell = CreateObject("WScript.Shell")
' Run electron directly from node_modules to avoid CMD windows
WshShell.Run "node_modules\.bin\electron . --startup", 0, False
Set WshShell = Nothing
