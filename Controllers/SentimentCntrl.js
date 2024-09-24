const { exec } = require('child_process');
const path = require('path');

exports.sentimentCntrl = async (req, res) => {
    console.log("Inside sentiment controller");
    const { symbol } = req.params;
    console.log(symbol);

    if (!symbol) {
        return res.status(400).json({ error: 'Stock symbol is required' });
    }

    const scriptPath = path.join(__dirname, 'sentiment_analysis.py');
    const command = `docker run --rm -v /c/Users/piyus/Desktop/FSDFinance/Backend/Controllers:/scripts --user root my-spark-py /opt/spark/bin/spark-submit /scripts/sentiment_analysis.py ${symbol}`;

    exec(command, (error, stdout, stderr) => {
        if (error) {
            console.error(`Error executing script: ${stderr}`);
            return res.status(500).json({ error: 'Error executing sentiment analysis' });
        }
    
        console.log(`Standard Output: ${stdout}`); // Log stdout for debugging
        console.log(`Standard Error: ${stderr}`); // Log stderr for debugging
    
        // Filter out non-JSON lines
        const jsonOutput = stdout
            .split('\n')
            .filter(line => line.trim().startsWith('[') || line.trim().startsWith('{')) // Include lines starting with JSON
            .join(''); // Join the remaining lines
    
        console.log(`Filtered JSON Output: ${jsonOutput}`); // Log filtered JSON output
    
        try {
            const result = JSON.parse(jsonOutput);
            const avgSentiment = result.length > 0 ? result[0].avg_sentiment : null;
    
            return res.json({
                stock_symbol: symbol,
                avg_sentiment: avgSentiment,
            });
        } catch (parseError) {
            console.error(`Error parsing JSON: ${parseError}`);
            return res.status(500).json({ error: 'Error parsing sentiment result' });
        }
    });
};
