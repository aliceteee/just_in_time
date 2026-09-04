const loginService = require('../services/login.services');

const login = async (req, res) => {
    try {
        const { email, senha } = req.body;

        if (!email || !senha) {
            return res.status(400).json({
                mensagem: 'Email e senha são obrigatórios.'
            });
        }

        const resultado = await loginService.login(email, senha);

        return res.status(200).json(resultado);

    } catch (erro) {
        return res.status(401).json({
            mensagem: erro.message
        });
    }
};

module.exports = {
    login
};