const express = require('express');
const fs = require('fs');
const { exec } = require('child_process');
const path = require('path');
const bodyParser = require('body-parser');
const axios = require('axios'); // 👈 新增 axios 用于发起 GraphQL 请求

const app = express();
const port = 3000;

// 使用 bodyParser 中间件解析 JSON 请求体
app.use(bodyParser.json());

// 定义不同样式的 LaTeX 模板
const styles = {
    style1: "\\documentclass{article}\\begin{document}Hello, LaTeX!\\end{document}",
    style2: "\\documentclass{article}\\usepackage{graphicx}\\begin{document}\\section*{Big Title} This is a larger title style. \\end{document}",
    style3: "\\documentclass{article}\\usepackage{graphicx}\\begin{document}\\begin{figure}[h]\\centering\\includegraphics[width=0.5\\textwidth]{example-image}\\caption{Example Image}\\end{figure}\\end{document}"
};

// 启动前自检，检查是否安装了 LaTeX
function checkLatexInstallation(callback) {
    exec('pdflatex --version', (error, stdout, stderr) => {
        if (error) {
            console.error('❌ LaTeX 没有安装，请安装 LaTeX 后再启动服务器');
            return callback(error);
        }
        console.log(`✅ LaTeX 已安装: ${stdout}`);
        callback(null);
    });
}

// POST 路由：接收 LaTeX 代码，写入文件并编译
app.post('/compile-latex', (req, res) => {
    console.log('收到 POST 请求');

    const latexCode = req.body.latex;
    const style = req.body.style || 'style1';  // 默认使用 style1

    if (!styles[style]) {
        return res.status(400).json({ error: 'Invalid style provided' });
    }

    // 根据 style 参数选择样式
    const selectedLatexCode = styles[style];

    const texFilename = path.join(__dirname, 'temp.tex');
    const pdfFilename = path.join(__dirname, 'temp.pdf');

    // 步骤 1: 将 LaTeX 代码写入文件
    fs.writeFileSync(texFilename, selectedLatexCode, 'utf8');
    console.log(`✅ LaTeX 代码写入: ${texFilename}`);

    // 步骤 2: 调用 pdflatex 编译
    const command = `pdflatex -interaction=nonstopmode ${texFilename}`;

    exec(command, (error, stdout, stderr) => {
        if (error) {
            console.error(`❌ 编译失败: ${error.message}`);
            return res.status(500).json({ error: 'Compilation failed', details: stderr || stdout });
        }

        console.log(`📄 编译输出:\n${stdout}`);

        // 步骤 3: 检查是否生成了 PDF 文件
        if (fs.existsSync(pdfFilename)) {
            console.log(`✅ PDF 文件成功保存到: ${pdfFilename}`);

            // 发送成功消息
            res.json({ message: 'PDF 文件已成功生成并保存到本地', pdfPath: pdfFilename });

            // 清理临时文件
            fs.unlinkSync(texFilename);
        } else {
            console.error('❌ PDF 文件未生成');
            res.status(500).json({ error: 'PDF not generated' });

            // 清理临时文件（即使失败了）
            fs.unlinkSync(texFilename);
        }
    });
});


// ✅ 新增的 GET 路由：代理调用 Foxx GraphQL 服务
app.get('/fetchall', async (req, res) => {
    try {
        const graphqlEndpoint = 'http://localhost:8529/_db/test/graphql';
        const query = `
            query {
                allNoteTitles {
                    id
                    titleZh
                }
            }
        `;

        const response = await axios.post(
            graphqlEndpoint,
            { query },
            {
                headers: { 'Content-Type': 'application/json' }
            }
        );

        res.json(response.data); // 原样返回结果
    } catch (error) {
        console.error('❌ Foxx 查询失败:', error.message);
        res.status(500).json({
            error: 'Foxx 查询失败',
            details: error.message
        });
    }
});

// 启动服务器前进行 LaTeX 安装检查
checkLatexInstallation((error) => {
    if (error) {
        // 如果 LaTeX 没有安装，退出程序
        process.exit(1);
    }

    // 如果 LaTeX 已安装，启动 Express 服务器
    app.listen(port, () => {
        console.log(`✅ Express 服务器正在运行, 监听端口 ${port}`);
    });
});
