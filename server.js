var express = require('express'),
bodyParser = require('body-parser'),
mongodb = require('mongodb'),
multiparty = require('connect-multiparty'), 
fs = require('fs');//nos dá a capacidade de manipular arquivos
//objectId = require('mongodb').ObjectId;
objectId = mongodb.ObjectId;

var app = express();

app.use(bodyParser.urlencoded({extended:true}));
app.use(bodyParser.json());
//incluindo connect multiparty como middleware para trabalharmos com arquivos
app.use(multiparty());

//Programando middleware para solucionar problema com preflight request
app.use(function(req,res,next){
	//Configurando headers
	res.setHeader("Access-Control-Allow-Origin", "http://localhost");//Configurando permissão para client fazer requisição ao servidor
	res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE");//Indica os métodos que o cliente pode requisitar
	res.setHeader("Access-Control-Allow-Headers", "content-type");//Permite que o cliente rescreva o header. No caso, informe qual é o content type enviado
	res.setHeader("Access-Control-Allow-Credentials", true);

	next();//next é um atributo que indica a continuação do processamento
});

var port = 8080;


var db = new mongodb.Db(
	'instagram',
	new mongodb.Server('localhost', 27017, {}),
	{}
	);

app.listen(port, function(){
	console.log('Servidor está escutando na porta' + port);
});

/*app.listen(port);
console.log('Servidor ok');*/

app.get('/',function(req, res){
	res.send({ msg: 'Olá Rodrigo'});
});


//POST (CREATE)
app.post('/api',function(req, res){
	// Setando os headers
	//res.setHeader("Access-Control-Allow-Origin", "*");// api respondendo para qualquer domínio
	//O código abaixo está incluso no middleware criado
	//res.setHeader("Access-Control-Allow-Origin", "http://localhost");//só responder para esse domínio(front end)


	//Recuperando os dados enviados na requisição
	//var dados = req.body;
	//res.send(dados);
	//console.log(req.files);//essa propriedade do request é populada quando enviado algum arquivo ao servidor
	// O servidor não consegue armazenar duas fotos com o mesmo nome. Por isso o id by time
	var date = new Date();
	time_stamp = date.getTime();
	var url_imagem = time_stamp + '_' + req.files.arquivo.originalFilename;

	var path_origem	= req.files.arquivo.path//definindo caminho de origem
	//configurar o caminho de destino 
	var path_destino = './uploads/' + url_imagem;
	fs.rename(path_origem, path_destino, function(err){
		if(err){
			res.status(500).json({error:err});	
			return;//finalizando o processamento do bloco
		}

		//armazenando dados de referência a noticia
		var dados = {
			url_imagem: url_imagem,
			titulo: req.body.titulo
		}

		db.open(function(err, mongoClient){
			mongoClient.collection('postagens', function(err, collection){
				collection.insert(dados, function(err, records){
					if(err){
						res.json({'status':'erro'});
					}else{
						res.json({'status': 'Inclusão realizada com sucesso'}); 
					}
					mongoClient.close();
				});
			})
		});
	});	
	//res.send({dados});

});

//GET (RECUPERA TODOS OS DOCUMENTOS)
app.get('/api',function(req, res){
	//O código abaixo está incluso no middleware criado
	//res.setHeader("Access-Control-Allow-Origin", "*");
	//res.send({dados});
	db.open(function(err, mongoClient){
		mongoClient.collection('postagens', function(err, collection){
			collection.find().toArray(function(err, results){
				if(err){
					res.json(err);
				}else{
					res.json(results);
				}
				mongoClient.close();
			});
		})
	});
});

//GET BY ID (RECUPERA O DOCUMENTO CORRESPONDENTE AO ID PESQUISADO)
app.get('/api/:id',function(req, res)
{
	//request.param = recupera os parâmetros da uri
	//var dados = req.body();
	db.open(function(err, mongoClient)
	{
		mongoClient.collection('postagens', function(err, collection)
		{
			collection.find(objectId(req.params.id)).toArray(function(err, results)
			{
				if(err)
				{
					res.json(err);
				}else
				{
					res.json(results);
				}
				mongoClient.close();
			});
		});
	});
});


app.get('/imagens/:image', function(req, res){
	//busca da imagem no diretório uploads
	var img = req.params.image;//recebendo o parâmetro imagem
	//recuperar os binários da imagem no diretório uploads
	fs.readFile('./uploads/'+ img, function(err, content){ // o content é o binário do arquivo
		if(err){
			//enviar erro para o cliente
			res.status(400).json(err);
			return;
		}else{
			res.writeHead(200, {'Content-type': 'image/jpg'});// permite setar varias informações no cabeçalho via json
			res.end(content);//pega uma determinada informação e escreve ela. No caso, escreve os binários

		}
	});
});






//PUT BY ID (ALTERA O DOCUMENTO CORRESPONDENTE AO ID PESQUISADO)
/*app.put('/api/:id',function(req, res)
{
	//res.send('teste');
	//request.param = recupera os parâmetros da uri
	//var dados = req.body();
	/*db.open(function(err, mongoClient)
	{
		mongoClient.collection('postagens', function(err, collection)
		{
			collection.update(
			{ _id : objectId(req.params.id) },//query de pesquisa
			{ $set : { titulo : req.body.titulo } },//parâmetros de atualização
			{},	//mult.Identifica se devemos atualizar uma ou mais collections
			function(err, records){//função de callback. Ação que deve ser tomada logo após a execução do update
				if(err){
					res.json(erro);
				}
				else{
					res.json(records);
				}
				mongoClient.close();
			}
			);
		});
	});
});*/


//PUT BY ID (ALTERA O DOCUMENTO CORRESPONDENTE AO ID PESQUISADO)
app.put('/api/:id',function(req, res)
{
	//res.send('teste');
	//request.param = recupera os parâmetros da uri
	//var dados = req.body();
	db.open(function(err, mongoClient)
	{
		mongoClient.collection('postagens', function(err, collection)
		{
			collection.update(
			{ _id : objectId(req.params.id) },//query de pesquisa
			{ $push : {//o push não atualiza. O push insere um novo registro dentro do registro postagem da collection postagens :>
						 comentarios :{
						 	id_comentarios: new objectId(),
						 	comentario: req.body.comentario
						 }  
					  }
			 },//parâmetros de atualização
			{},	//mult.Identifica se devemos atualizar uma ou mais collections
			function(err, records){//função de callback. Ação que deve ser tomada logo após a execução do update
				if(err){
					res.json(erro);
				}
				else{
					res.json(records);
				}
				mongoClient.close();
			}
			);
		});
	});
});


//DELETE BY ID (DELETA O DOCUMENTO CORRESPONDENTE AO ID PESQUISADO)
/*app.delete('/api/:id',function(req, res)
{
	//request.param = recupera os parâmetros da uri
	//var dados = req.body();
	db.open(function(err, mongoClient)
	{
		mongoClient.collection('postagens', function(err, collection)
		{
			collection.remove({ _id: objectId(req.params.id)}, function(err, records){
				if(err){
					res.send(err);
				}else{
					res.status(200).send(records);
				}
				mongoClient.close();
			 });
		});
	});
});*/



//DELETE BY ID (DELETA O DOCUMENTO CORRESPONDENTE AO ID PESQUISADO)
app.delete('/api/:id',function(req, res)
{
	//request.param = recupera os parâmetros da uri
	//var dados = req.body();
	db.open(function(err, mongoClient)
	{
		mongoClient.collection('postagens', function(err, collection)
		{
			collection.update(
				{},
				{ $pull : { comentarios: {
								id_comentarios: objectId(req.params.id)
						    }
					   	}
			  	},
				{ multi: true},
				function(err, records){
					if(err){
						res.json(err);
					}
					res.json(records);
					mongoClient.close();
				}
				);
			 });
		});
	});
