const express = require('express')
const app = express()
const cors = require('cors')

const mongoose = require("mongoose");
const bodyParser = require('body-parser');

require('dotenv').config()

app.use(cors())
app.use(express.static('public'))
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html')
});


/**/
mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true });


app.use(cors());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

// Conexão com MongoDB Atlas
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
  .then(() => console.log("Conectado ao MongoDB!"))
  .catch((err) => console.error("Erro de conexão com MongoDB:", err));

// **Schema e Modelo**
const userSchema = new mongoose.Schema({
  username: { type: String, required: true }
});

const exerciseSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  description: String,
  duration: Number,
  date: Date
});

const User = mongoose.model("User", userSchema);
const Exercise = mongoose.model("Exercise", exerciseSchema);

// **Rota 1: Criar um novo usuário**
app.post("/api/users", async (req, res) => {
  console.log("POST /api/users - Criando usuário");

  const user = new User({ username: req.body.username });
  
  await user.save()
    .then(savedUser => {
      console.log(`Usuário criado: ${savedUser.username} com ID: ${savedUser._id}`);
      res.json({ username: savedUser.username, _id: savedUser._id });
    })
    .catch(err => {
      console.log("Erro ao criar usuário:", err);
      res.status(500).json({ error: "Erro ao criar usuário" });
    });
});

// **Rota 2: Listar todos os usuários**
app.get("/api/users", async (req, res) => {
  console.log("GET /api/users - Listando usuários");

  const users = await User.find({}, "_id username");
  console.log(`Usuários encontrados: ${users.length}`);
  
  res.json(users);
});

// **Rota 3: Adicionar exercício**
app.post("/api/users/:_id/exercises", async (req, res) => {
  console.log(`POST /api/users/${req.params._id}/exercises - Adicionando exercício`);

  const { description, duration, date } = req.body;
  
  const user = await User.findById(req.params._id);
  if (!user) {
    console.log(`Usuário com ID: ${req.params._id} não encontrado.`);
    return res.json({ error: "User not found" });
  }

  // Se a data não for fornecida, usa a data atual
  const exerciseDate = date ? new Date(date) : new Date(); 

  // Criar o exercício com os dados fornecidos
  const exercise = new Exercise({
    userId: user._id,
    description,
    duration: parseInt(duration),
    date: exerciseDate
  });

  await exercise.save()
    .then(savedExercise => {
      console.log(`Exercício adicionado: ${savedExercise.description} com duração de ${savedExercise.duration} minutos`);
      res.json({
        _id: user._id,
        username: user.username,
        date: savedExercise.date.toDateString(), // Data formatada como string
        duration: savedExercise.duration,
        description: savedExercise.description
      });
    })
    .catch(err => {
      console.log("Erro ao adicionar exercício:", err);
      res.status(500).json({ error: "Erro ao adicionar exercício" });
    });
});

// Rota 4: Obter log de exercícios
app.get("/api/users/:_id/logs", async (req, res) => {
  console.log(`GET /api/users/${req.params._id}/logs - Obtendo logs`);

  const { from, to, limit } = req.query;

  // Verificar se o usuário existe
  const user = await User.findById(req.params._id);
  if (!user) {
    console.log(`Usuário com ID: ${req.params._id} não encontrado.`);
    return res.json({ error: "User not found" });
  }

  // Filtro de datas, se "from" ou "to" forem passados
  let filter = { userId: user._id };
  if (from || to) {
    filter.date = {};
    if (from) filter.date.$gte = new Date(from);  // "from" como data mínima
    if (to) filter.date.$lte = new Date(to);      // "to" como data máxima
  }

  // Query para pegar os exercícios
  let query = Exercise.find(filter).select("description duration date -_id");

  // Limitar o número de resultados, se "limit" for passado
  if (limit) query = query.limit(parseInt(limit));

  // Executar a consulta
  const exercises = await query.exec();

  // Preparar os exercícios no formato correto
  const log = exercises.map(e => ({
    description: e.description,         // Garantir que a descrição seja uma string
    duration: e.duration,               // Garantir que a duração seja um número
    date: e.date.toDateString()         // Garantir que a data seja uma string no formato correto
  }));

  console.log(`Logs de exercícios encontrados: ${exercises.length}`);

  // Resposta final
  res.json({
    _id: user._id,
    username: user.username,
    count: exercises.length, // Número de exercícios
    log: log // Lista dos exercícios no formato correto
  });
});

/**/

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
})
