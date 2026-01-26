import csurf from 'csurf';

app.use(
  csurf({
    cookie: {
      httpOnly: true,
      secure: true,
      sameSite: 'strict',
    },
  }),
);
