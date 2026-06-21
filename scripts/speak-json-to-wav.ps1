param(
  [Parameter(Mandatory = $true)][string]$InputJsonPath,
  [Parameter(Mandatory = $true)][string]$OutputWavPath,
  [string]$Voice = "Microsoft Heami Desktop",
  [int]$Rate = 0
)

Add-Type -AssemblyName System.Speech

$payload = Get-Content -LiteralPath $InputJsonPath -Raw -Encoding UTF8 | ConvertFrom-Json
$outputDir = Split-Path -Parent $OutputWavPath
New-Item -ItemType Directory -Force -Path $outputDir | Out-Null

$synth = New-Object System.Speech.Synthesis.SpeechSynthesizer
$synth.SelectVoice($Voice)
$synth.Rate = $Rate

$format = New-Object System.Speech.AudioFormat.SpeechAudioFormatInfo(
  [System.Speech.AudioFormat.EncodingFormat]::Pcm,
  16000,
  16,
  1,
  32000,
  2,
  $null
)

$builder = New-Object System.Speech.Synthesis.PromptBuilder(
  [System.Globalization.CultureInfo]::GetCultureInfo("ko-KR")
)

foreach ($segment in $payload.segments) {
  if ($segment.type -eq "break") {
    $builder.AppendBreak([TimeSpan]::FromMilliseconds([int]$segment.ms))
  } elseif ($segment.text) {
    $builder.AppendText([string]$segment.text)
  }
}

$synth.SetOutputToWaveFile($OutputWavPath, $format)
$synth.Speak($builder)
$synth.SetOutputToNull()
$synth.Dispose()
