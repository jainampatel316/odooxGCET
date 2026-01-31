
import express from 'express';
import cookieParser from 'cookie-parser';
import cors from 'cors';

const app = express();

/* -------------------- MIDDLEWARE -------------------- */
app.use(express.json());
app.use(cookieParser());
app.use(cors({
  origin: 'http://localhost:5173',
  credentials: true,
}));

import authRouter from './src/routes/auth.routes.js';
import productRouter from './src/routes/product.routes.js'
/* import notebookRouter from './routes/notebook.routes.js';
import documentRouter from "./routes/document.routes.js";
import noteRouter from './routes/note.routes.js'; */

app.use("/auth",authRouter);
app.use("/products",productRouter);
/* app.use("/",notebookRouter);
app.use("/",documentRouter);
app.use("/",noteRouter); */

/* -------------------- START -------------------- */
app.listen(4000, () => {
  console.log('Server running on http://localhost:4000');
});


////////////////////////////////////////////////////////////



