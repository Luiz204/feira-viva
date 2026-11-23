-- Feiras de exemplo para a demonstração (ajuste endereços e horários reais).
insert into public.fairs (nome, endereco, bairro, cidade, dias_semana, horario_inicio, horario_fim) values
  ('Feira da Agricultura Familiar — Centro', 'Praça Pedro II', 'Centro', 'Teresina', '{6}', '06:00', '12:00'),
  ('Feira Orgânica do Jóquei', 'Av. Nossa Senhora de Fátima', 'Jóquei', 'Teresina', '{3,6}', '05:30', '11:00'),
  ('Feira Livre do Dirceu', 'Rua Dirceu Arcoverde', 'Dirceu', 'Teresina', '{0}', '05:00', '12:00');

-- Para tornar um usuário administrador (depois que ele se cadastrar):
-- update public.profiles set role = 'admin' where id = (select id from auth.users where email = 'seu-email@exemplo.com');
