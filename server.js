const express = require('express');
const axios = require('axios');
const fs = require('fs');
const path = require('path');

const app = express();
app.use(express.json());

// Procura a pasta public
const publicPath = fs.existsSync(path.join(__dirname, 'public')) 
    ? path.join(__dirname, 'public') 
    : __dirname;

app.use(express.static(publicPath));

// ID da Planilha do Google Sheets do Condomínio Haras Urucum
const SPREADSHEET_ID = '1ObEDH_Px_hfNpFPZtp7wDHNKpct_rfGXybN35Id2fXA';
const CSV_URL = `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/export?format=csv`;

// Registo do histórico de acessos (Log)
function registarLog(lote, usuario) {
    const dataHora = new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });
    const mensagemLog = `[${dataHora}] Acesso confirmado -> Lote: ${lote} | Utilizador: ${usuario}\n`;
    
    fs.appendFile(path.join(__dirname, 'acessos.log'), mensagemLog, (err) => {
        if (err) console.error('Erro ao gravar log:', err);
    });
}

// Rota para validar o Login do Morador
app.post('/api/login', async (req, res) => {
    const { usuario, senha } = req.body;

    try {
        const response = await axios.get(CSV_URL);
        const linhas = response.data.split('\n');

        let usuarioEncontrado = null;

        for (let i = 1; i < linhas.length; i++) {
            const colunas = linhas[i].split(',').map(c => c.trim().replace(/"/g, ''));
            if (colunas.length >= 4) {
                const lote = colunas[0];
                const morador = colunas[1];
                const userPlanilha = colunas[2];
                const senhaPlanilha = colunas[3];
                const leituraAgua = colunas[4] || 'N/A';
                const fotoHidrometro = colunas[5] || '';
                const boletoPdf = colunas[6] || '';

                if (userPlanilha === usuario && senhaPlanilha === senha) {
                    usuarioEncontrado = {
                        lote,
                        morador,
                        leituraAgua,
                        fotoHidrometro,
                        boletoPdf
                    };
                    break;
                }
            }
        }

        if (usuarioEncontrado) {
            registarLog(usuarioEncontrado.lote, usuario);
            return res.json({ sucesso: true, dados: usuarioEncontrado });
        } else {
            return res.status(401).json({ sucesso: false, mensagem: 'Utilizador ou senha incorretos!' });
        }
    } catch (error) {
        console.error('Erro ao consultar a planilha:', error);
        return res.status(500).json({ sucesso: false, mensagem: 'Erro ao consultar a planilha do condomínio.' });
    }
});

// Rota principal para carregar a página inicial
app.get('*', (req, res) => {
    const indexPath = fs.existsSync(path.join(publicPath, 'index.html'))
        ? path.join(publicPath, 'index.html')
        : path.join(__dirname, 'index.html');
    res.sendFile(indexPath);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Servidor a rodar na porta ${PORT}`);
});
