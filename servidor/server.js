const express = require('express');
const bodyParser = require('body-parser');
const app = express();
const sequelize = require('../index'); 
const jwt = require('jsonwebtoken'); 
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

function logAccesedPath(req, res, next){
    console.log(
        `LogRequest: A las ${new Date()} usuario accedio a  la ruta ${req.path} `
    );
    next();
};

// Asignacion de middlewares
app.use(logAccesedPath);
app.use(bodyParser.json());


app.get('/', (req, res) => {
    res.status(200);
    
    res.json({
        WelcomeMessage: "Welcome to our API service",
        ServiceName: "Delillah Resto API",
        ServiceStatus: "Private",
        SignIn: "localhost:3000/usuarios/signup",
        LogIn: "localhost:3000/usuarios/signin",
        ServerAdmin: "Eze Hertz"
    });
});

// ENDPOINTS DE USUARIO

app.post('/usuarios/signup', (req, res) => {
    sequelize.sequelize.query(`insert into usuarios (nombreCompleto, email, tel, dirEnvio, userName, pass, esAdmin)
    values (?, ?, ?, ?, ?, ?, ?)`,
    {replacements: [req.body.nombreCompleto, req.body.email, req.body.tel, req.body.dirEnvio, req.body.userName, req.body.pass, req.body.esAdmin]}
    ).then( () => {
        res.status(200);
        res.send(req.body);
    });
});

app.post('/usuarios/signin', (req, res) => {
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

// CRUD DE PRODUCTOS

app.get('/productos', autenticarUsuario, (req, res) => {
    sequelize.sequelize.query('SELECT id_prod, nombre, descripcion, precio FROM PRODUCTOS WHERE de_baja = 0',
    {type: sequelize.sequelize.QueryTypes.SELECT}
    ).then(resultado => {
        res.status(200);
        res.send(resultado);
    });
});

app.post('/productos', autenticarUsuario, (req, res) => {
    
    if(req.usuario.admin == 1){
        sequelize.sequelize.query(`insert into productos (nombre, descripcion, precio, de_baja)
            values (?, ?, ?, false)`,
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

app.delete('/productos', autenticarUsuario, (req, res) => {
    if(req.usuario.admin == 1){
        const id_prod = req.body.id_prod;
        sequelize.sequelize.query(`update productos set de_baja = 1 where id_prod = :id_prod`, 
        {replacements: {id_prod: id_prod}}
        ).then(resultado => {
            res.status(200);
            res.send(`Producto con id numero ${id_prod} ha sido eliminado.`);
        });
    }
    else{
        res.status(401);
        res.json({Error: 'Unauthorized'});
    }
});

app.put('/productos', autenticarUsuario, (req, res) => {
    
    if(req.usuario.admin == 1){
        
        sequelize.sequelize.query('update productos set nombre = :nombre, descripcion = :descripcion, precio = :precio where id_prod = :id_prod',
        {replacements: {nombre: req.body.nombre, descripcion: req.body.descripcion, precio: req.body.precio, id_prod: req.body.id_prod}}
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

// CRUD DE PEDIDOS
app.post('/pedidos', autenticarUsuario, (req, res) => {

    let list = req.body.items_pedido;
    
    try{
        

        sequelize.sequelize.query(`insert into pedidos
        (id_pedido, estado, hora, forma_pago, id_usuario) values (id_pedido, 'nuevo', curdate(), ?, ?)`,
        {replacements: [req.body.forma_pago, req.usuario.id]}
        )
        .then(
        list.forEach(item => {
            sequelize.sequelize.query(`insert into item_pedidos
            (item_id, id_pedido, id_prod, cantidad) values (item_id, (select max(id_pedido) as id_pedido from pedidos where id_usuario = ${req.usuario.id}),
            ?,?)`,
            {replacements: [item.id_prod, item.cantidad]})
        })
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

app.put('/pedidos', autenticarUsuario, (req, res) => {

    if(req.usuario.admin == 1){

        const idPedido = req.body.id_pedido;
        sequelize.sequelize.query('update pedidos set estado = :estado where id_pedido = :id_pedido',
        {replacements: {estado: req.body.estado, id_pedido: idPedido}}
        )
        .then(pedidoActualizado => {
            
            res.json({pedidoActualizado: req.body});
        });

    }    
    else{
        res.status(401);
        res.json({Error: 'Unauthorized'});
    }
});

app.get('/pedidos', autenticarUsuario, (req, res) => {
    
    if(req.usuario.admin == 1){
        sequelize.sequelize.query(`select estado, hora, forma_pago, id_prod, cantidad, nombreCompleto, dirEnvio  from item_pedidos
        inner join pedidos 
        on pedidos.id_pedido = item_pedidos.id_pedido
        inner join usuarios on usuarios.id_usuario = pedidos.id_usuario`,
        {type: sequelize.sequelize.QueryTypes.SELECT}
        )
        
        .then(resultado => {
            res.status(200);
            res.send(resultado);
        });
    }
    else{
        sequelize.sequelize.query(`select estado, hora, forma_pago, id_prod, cantidad, nombreCompleto, dirEnvio  from item_pedidos
        inner join pedidos 
        on pedidos.id_pedido = item_pedidos.id_pedido
        inner join usuarios on usuarios.id_usuario = pedidos.id_usuario WHERE PEDIDOS.ID_USUARIO = :id_usuario`,
        {replacements: {id_usuario: req.usuario.id}, type: sequelize.sequelize.QueryTypes.SELECT}
        )
        .then(resultado => {
            res.status(200);
            res.send(resultado);
        });
    };

});

app.delete('/pedidos', autenticarUsuario, (req, res) => {
    
    if(req.usuario.admin == 1){
        sequelize.sequelize.query(`DELETE FROM item_pedidos WHERE id_pedido = :id_pedido`,
        {replacements: {id_pedido: req.body.id_pedido}}
        ).then(
            sequelize.sequelize.query(`DELETE FROM pedidos WHERE id_pedido = :id_pedido`,
            {replacements: {id_pedido: req.body.id_pedido}}
            )
            .then(resultado => {
                res.status(200);
                res.send('Pedido eliminado correctamente.');
            })
        ); 
    }
    else{
        res.status(401);
        res.json({Error: 'Unauthorized'});
    };
})

// Iniciar server
app.listen(3000, () => {
    console.log('Servidor iniciado!');
});