const prisma = require('../data/prisma');

const login = async (email, senha) => {
    const usuario = await prisma.usuario.findUnique({
        where: {
            email: email
        }
    });

    if (!usuario) {
        throw new Error('Usuário não cadastrado.');
    }

    if (usuario.senha !== senha) {
        throw new Error('Senha incorreta.');
    }

    return {
        mensagem: 'Login realizado com sucesso.',
        usuario: {
            id: usuario.id,
            nome: usuario.nome,
            email: usuario.email
        }
    };
};

module.exports = {
    login
};