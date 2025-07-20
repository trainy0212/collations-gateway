const fs = require('fs');
const { exec } = require('child_process');
const path = require('path');

// 步骤 1: 写入 LaTeX 源码
const latexCode = `
\\documentclass{article}
\\begin{document}
Hello, LaTeX from Node.js!
\\end{document}
`;

const texFilename = 'example.tex';
fs.writeFileSync(texFilename, latexCode, 'utf8');
console.log(`✅ LaTeX 源码写入成功: ${texFilename}`);

// 步骤 2: 编译 LaTeX 文件
const command = `pdflatex -interaction=nonstopmode ${texFilename}`;

exec(command, (error, stdout) => {
    if (error) {
        console.error(`❌ 编译失败: ${error.message}`);
        return;
    }

    console.log(`📄 编译输出:\n${stdout}`);

    const pdfFile = path.basename(texFilename, '.tex') + '.pdf';
    if (fs.existsSync(pdfFile)) {
        console.log(`✅ PDF 编译成功: ${pdfFile}`);
    } else {
        console.error(`❌ PDF 文件未生成`);
    }
});
