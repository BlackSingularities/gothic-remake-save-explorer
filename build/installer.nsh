; Wersje do 1.2.2 instalowały się dla bieżącego użytkownika (wpis w HKCU). Od 1.3.0 program
; trafia do Program Files – usuwamy starą kopię, żeby nie zostały dwie aplikacje.
!macro customInit
  ReadRegStr $0 HKCU "${UNINSTALL_REGISTRY_KEY}" "QuietUninstallString"
  ${if} $0 != ""
    ExecWait '$0'
    DeleteRegKey HKCU "${UNINSTALL_REGISTRY_KEY}"
  ${endif}
!macroend
