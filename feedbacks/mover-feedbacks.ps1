
# Criar pasta de destino
$destino = "C:\Users\dani_\Downloads\projeto-rpg\feedbacks"
New-Item -ItemType Directory -Force -Path $destino

# Mover arquivos baixados
$arquivos = @(
  "UX4-traducao-ingles-portugues-misturado.png",
  "UX1-fechar-modal-click-outside.png",
  "BUG2-atalho-hp-mais-menos-nao-funciona.png",
  "UX2-clicar-criatura-fora-do-turno.png",
  "UX3-ruleset-config-global-vs-individual.png",
  "SEO1-og-image-faltando-preview-whatsapp.png",
  "BUG1-tipagem-object-object-nos-monstros.png",
  "FEAT2-gerar-personagens-por-classe.png"
)

foreach ($arquivo in $arquivos) {
  $origem = "C:\Users\dani_\Downloads\$arquivo"
  if (Test-Path $origem) {
    Move-Item -Path $origem -Destination "$destino\$arquivo" -Force
    Write-Host "Movido: $arquivo"
  } else {
    Write-Host "Nao encontrado: $arquivo"
  }
}

Write-Host "Concluido!"
