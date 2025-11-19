import http.server
import socketserver
import os

# Usando a porta 8080 por padrão, que não requer permissões de administrador
PORT = 8080
DIRECTORY = "."

class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=DIRECTORY, **kwargs)

def run_server():
    # Muda o diretório de trabalho para o diretório onde o script está
    os.chdir(os.path.dirname(os.path.abspath(__file__)))
    
    print(f"Servindo arquivos do diretório: {os.getcwd()}")
    print(f"Acessível em http://localhost:{PORT} ou http://Operasup.com:{PORT}")

    try:
        with socketserver.TCPServer(("", PORT), Handler) as httpd:
            print(f"Servidor iniciado com sucesso na porta {PORT}")
            print("Pressione Ctrl+C para parar o servidor.")
            httpd.serve_forever()
    except Exception as e:
        print(f"\nERRO FATAL: Não foi possível iniciar o servidor na porta {PORT}.")
        print(f"Verifique se a porta {PORT} está livre e se o Python está instalado corretamente.")
        print(f"Detalhes do erro: {e}")

if __name__ == "__main__":
    run_server()
