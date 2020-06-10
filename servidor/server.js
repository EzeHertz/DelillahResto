const express = require('express');
const bodyParser = require('body-parser');
const app = express();
const sequelize = require('../index'); //Objeto Sequelize
const jwt = require('jsonwebtoken'); // JWT
const firma = 'miFirma';


/*

-- Generar Token --

const usuario = {userName: ''};
const contrasena = '';
const token = jwt.sign(usuario, contrasena);
const descodificado = jwt.verify(token,contrasena);

*/

function validarUsuario(userName, pass){
    return sequelize.sequelize.query(`select id_usuario, userName, pass, esAdmin from usuarios where userName = ? and pass = ?`,
    {replacements: [userName, pass], type: sequelize.sequelize.QueryTypes.SELECT }
    ).then(resultado => {

        const usuario = resultado[0];
        
        if(usuario && usuario["userName"] == userName && usuario["pass"] == pass){
            
            return {
                id: usuario['id_usuario'],
                userName: `${userName}`,
                admin: usuario['esAdmin']
            };

        };
        
        return null;

    });
};

function generarToken(usuario){
    return jwt.sign(usuario, firma);
};

const autenticarUsuario = (req, res, next) => {
    console.log('middleware');
    try{
        // Se guarda el token enviado x el usuario en una variable
        const token = req.headers.authorization.split(' ')[1];
        console.log(token);
        const verificarToken = jwt.verify(token, firma);
        if(verificarToken){
            req.usuario = verificarToken;
            return next();
        }
        
    }
    catch (error){
        res.json({error: 'Error al validar usuario'});
    }
    
};

function GetProductFromDB(id_prod){

    try{
        return sequelize.sequelize.query(`select * from productos where id_prod = ${id_prod}`,
        {type: sequelize.sequelize.QueryTypes.SELECT}
        )
        .then(producto => {
            console.log(producto[0]);
            return producto[0];
        });
    }
    catch(err){
        return err;
    }

};

function updateProductInDB(id_prod, nombre, descripcion, precio){

    sequelize.sequelize.query(`update pedidos ${nombre}, ${descripcion}, ${precio} where id_prod = ${id_prod}`)

};

// Definicion de function middleware

function middleware(req, res, next){
    console.log(
        `Middleware logRequest: A las ${new Date()} usuario accedio a  la ruta ${req.path} `
    );
    next();
};

// Asignando funcion middleware para todas las rutas
app.use(middleware);
app.use(bodyParser.json());

// Definicion de rutas
app.get('/', (req, res) => {
    res.status(200);
    
    res.json({
        WelcomeMessage: "Welcome to our API service",
        ServiceName: "Delillah Resto API",
        ServiceStatus: "Private",
        SignIn: "localhost:3000/usuarios/signin",
        LogIn: "localhost:3000/usuarios/login",
        ServerAdmin: "Eze Hertz"
    });
});


// sql.sequelize.authenticate().then(async() => {
//     const query = 'select * from usuarios where id_usuario = 1';
//     const [resultados] = await sql.sequelize.query(query, { raw:true });

//     return resultados;   
// })


// EndPoints de usuarios

app.post('/usuarios/singin', (req, res) => {
    sequelize.sequelize.query(`insert into usuarios (nombreCompleto, email, tel, dirEnvio, userName, pass, esAdmin)
    values (?, ?, ?, ?, ?, ?, ?)`,
    {replacements: [req.body.nombreCompleto, req.body.email, req.body.tel, req.body.dirEnvio, req.body.userName, req.body.pass, req.body.esAdmin]}
    ).then( () => {
        res.status(200);
        res.send(req.body);
    });
});

app.post('/usuarios/login', (req, res) => {
    const {userName, pass} = req.body;

    validarUsuario(userName, pass)
    .then(usuario => {
        if(usuario != null){
            res.status(200);
            res.json({token: generarToken(usuario)});
        }
        else{
            res.status(500);
            res.send('usuario incorrecto');
        }
    })

});

app.get('/usuarios', autenticarUsuario, (req, res) => {

    console.log(req.usuario.admin);

    if(req.usuario.admin == 1){
            sequelize.sequelize.query('select * from usuarios',
        {type: sequelize.sequelize.QueryTypes.SELECT}
        )
        .then(resultados => {
            res.status(200);
            res.send(resultados);
        });
    }
    else{
        res.status(401)
        res.json({Error: 'Unauthorized'});
    }


});

app.get('/usuarios/:id', autenticarUsuario, (req, res) => {
    const idUser = req.params.id;
    sequelize.sequelize.query('select * from usuarios where id_usuario = :id ',
    {replacements: {id: idUser}, type: sequelize.sequelize.QueryTypes.SELECT}
    ).then(resultado => {
        res.status(200);
        res.send(resultado);
    });
});

app.delete('/usuarios/:id', autenticarUsuario, (req, res) => {
    
    if(req.usuario.admin == 1){
        const idUser = req.params.id;
        sequelize.sequelize.query('delete from usuarios where id_usuario = :id',
        { replacements: {id: idUser} } 
        ).then(resultado => {
            res.status(200);
            res.send(`El usuario con id: ${idUser} se eliminó correctamente.`);
        });
    }
    else{
        res.status(401);
        res.json({Error: 'Unauthorized'});
    }
});

// EndPoints de productos

app.get('/productos', autenticarUsuario, (req, res) => {
    sequelize.sequelize.query('SELECT * FROM PRODUCTOS',
    {type: sequelize.sequelize.QueryTypes.SELECT}
    ).then(resultado => {
        res.status(200);
        res.send(resultado);
    });
});

app.get('/productos/:id', autenticarUsuario, (req, res) => {
    const idProd = req.params.id;
    sequelize.sequelize.query('select * from productos where id_prod = :id ',
    {replacements: {id: idProd}, type: sequelize.sequelize.QueryTypes.SELECT}
    ).then(resultado => {
        res.send(resultado);
    });
});

app.post('/productos', autenticarUsuario, (req, res) => {
    
    if(req.usuario.admin == 1){
        sequelize.sequelize.query(`insert into productos (nombre, descripcion, precio)
            values (?, ?, ?)`,
        {replacements: [req.body.nombre, req.body.descripcion, req.body.precio]}
        ).then( () => {
            res.status(200);
            res.send(req.body);
        });
    }
    else{
        res.status(401);
        res.json({Error: 'Unauthorized'});
    }
    
});

app.delete('/productos/:id', autenticarUsuario, (req, res) => {
    if(req.usuario.admin == 1){
        const idProd = req.params.id;
        sequelize.sequelize.query(`Delete from productos where id_prod = :id`, 
        {replacements: {id: idProd}}
        ).then(resultado => {
            res.status(200);
            res.send(`Producto con id numero ${idProd} ha sido eliminado.`);
        });
    }
    else{
        res.status(401);
        res.json({Error: 'Unauthorized'});
    }
});

app.put('/productos/:id', autenticarUsuario, (req, res) => {
    
    if(req.usuario.admin == 1){
        const idProd = req.params.id;
        sequelize.sequelize.query('update productos set nombre = :nombre, descripcion = :descripcion, precio = :precio where id_prod = :id_prod',
        {replacements: {nombre: req.body.nombre, descripcion: req.body.descripcion, precio: req.body.precio, id_prod: idProd}}
        )
        .then(productoActualizado => {
            
            res.json({ProductoActualizado: req.body});
        });
    }
    else{
        res.status(401);
        res.json({Error: 'Unauthorized'});
    }
});

// EndPoints de pedidos

app.post('/pedidos', autenticarUsuario, (req, res) => {
    try{
        sequelize.sequelize.query(`insert into pedidos values(id_pedido, 'nuevo', ?, curdate(), ?, ?, ?)`,
        {replacements: [req.body.cantidad, req.body.forma_pago, req.usuario.id, req.body.id_prod]}
        )
        .then(pedidoRealizado => {
            res.status(200);
            res.send('Pedido realizado correctamente.');
        });
    }
    catch(err){
        res.send(err);
    }
});

app.get('/pedidos', autenticarUsuario, (req, res) => {
    
    if(req.usuario.admin == 1){
        sequelize.sequelize.query(`SELECT * FROM PEDIDOS`,
        {type: sequelize.sequelize.QueryTypes.SELECT}
        )
        .then(resultado => {
            res.status(200);
            res.send(resultado);
        });
    }
    else{
        sequelize.sequelize.query(`SELECT * FROM PEDIDOS WHERE ID_USUARIO = :id_usuario`,
        {replacements: {id_usuario: req.usuario.id}, type: sequelize.sequelize.QueryTypes.SELECT}
        )
        .then(resultado => {
            res.status(200);
            res.send(resultado);
        });
    };

});

// Iniciar server
app.listen(3000, () => {
    console.log('Servidor iniciado!');
});