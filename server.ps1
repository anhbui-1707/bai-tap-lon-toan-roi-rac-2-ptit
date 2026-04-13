$port = 8000
$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add("http://localhost:$port/")
try {
    $listener.Start()
    Write-Host "✅ Web server running at http://localhost:$port/"
    
    while ($listener.IsListening) {
        try {
            $context = $listener.GetContext()
            $request = $context.Request
            $response = $context.Response
            
            $filePath = $request.Url.LocalPath
            if ($filePath -eq "/") { $filePath = "/index.html" }
            
            $fullPath = "C:\python\game" + $filePath.Replace("/", "\")
            
            if (Test-Path $fullPath -PathType Leaf) {
                $bytes = [System.IO.File]::ReadAllBytes($fullPath)
                $response.ContentLength64 = $bytes.Length
                
                if ($fullPath -match "\.html$") { $response.ContentType = "text/html; charset=utf-8" }
                elseif ($fullPath -match "\.js$") { $response.ContentType = "application/javascript" }
                elseif ($fullPath -match "\.css$") { $response.ContentType = "text/css" }
                
                $response.OutputStream.Write($bytes, 0, $bytes.Length)
                $response.StatusCode = 200
            } else {
                $response.StatusCode = 404
            }
            
            $response.OutputStream.Close()
        } catch {
            Write-Host "Request error: $_"
        }
    }
} catch {
    Write-Host "❌ Error: $_"
}
