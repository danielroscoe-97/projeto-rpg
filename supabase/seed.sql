-- seed.sql
-- Seeds condition_types (13 standard conditions)
-- Monsters and spells are seeded via separate import scripts

INSERT INTO condition_types (name, description) VALUES
  ('Abalado', 'Não pode se mover voluntariamente.'),
  ('Cego', 'Falha em testes de Percepção baseados em visão. Ataques contra este ser têm vantagem; seus ataques têm desvantagem.'),
  ('Encantado', 'Não pode atacar o encantador. O encantador tem vantagem em testes sociais contra este ser.'),
  ('Assustado', 'Desvantagem em testes e ataques enquanto a fonte do medo estiver em linha de visão. Não pode se aproximar voluntariamente da fonte.'),
  ('Agarrado', 'Velocidade reduzida a 0. Condição termina se o agarrador for incapacitado ou afastado.'),
  ('Incapacitado', 'Não pode executar ações ou reações.'),
  ('Invisível', 'Ataques contra este ser têm desvantagem; seus ataques têm vantagem. Não pode ser visto sem meios especiais.'),
  ('Paralisado', 'Incapacitado. Falha automaticamente em saves de FOR e DES. Ataques contra este ser têm vantagem e são críticos se o atacante estiver a 1,5m.'),
  ('Petrificado', 'Transformado em pedra. Incapacitado, resistente a todos os danos, imune a veneno e doenças.'),
  ('Envenenado', 'Desvantagem em rolagens de ataque e testes de habilidade.'),
  ('Caído', 'Só pode rastejar. Ataques de longa distância contra este ser têm desvantagem. Ataques corpo a corpo têm vantagem se o atacante estiver a 1,5m.'),
  ('Contido', 'Velocidade reduzida a 0. Ataques contra este ser têm vantagem; seus ataques têm desvantagem. Desvantagem em saves de DES.'),
  ('Atordoado', 'Incapacitado. Falha automaticamente em saves de FOR e DES. Ataques contra este ser têm vantagem.')
ON CONFLICT (name) DO NOTHING;
