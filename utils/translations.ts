import { Language } from '../types';

export interface Translations {
  ace: string;
  aces: string;
  advanced: string;
  advantageRule: string;
  aggressiveMargin: string;
  breakPoint: string;
  breakPointsConverted: string;
  breakPointsSaved: string;
  broadcast: string;
  byPlayer: string;
  cancel: string;
  control: string;
  decider: string;
  doubleFault: string;
  doubleFaults: string;
  doublesMode: string;
  downloadJson: string;
  duration: string;
  efficiencyStats: string;
  exit: string;
  exportImage: string;
  exportPdf: string;
  fault: string;
  firstServeIn: string;
  firstServePointsWon: string;
  firstServer: string;
  forcedError: string;
  forcedErrors: string;
  gamesPerSet: string;
  journal: string;
  linkCopied: string;
  live: string;
  matchFinished: string;
  matchFormat: string;
  matchPoint: string;
  matchResult: string;
  noAd: string;
  partner1: string;
  partner2: string;
  player1: string;
  player2: string;
  playerNames: string;
  pointWonBy: string;
  pointsWonOnReturn: string;
  pointsWonOnServe: string;
  rally: string;
  returnError: string;
  returnFirstServePointsWon: string;
  returnSecondServePointsWon: string;
  returnStats: string;
  returnWinner: string;
  returnWinners: string;
  secondServe: string;
  secondServePointsWon: string;
  serviceStats: string;
  serving: string;
  setPoint: string;
  sets: string;
  setupSubtitle: string;
  setupTitle: string;
  simple: string;
  singlesMode: string;
  standard: string;
  standardSet: string;
  startMatch: string;
  stats: string;
  superTiebreak: string;
  tieBreak: string;
  to: string;
  totalPoints: string;
  undo: string;
  unforcedError: string;
  unforcedErrors: string;
  viewerModeReadOnly: string;
  whoHitIt: string;
  winner: string;
  winnerShot: string;
  winners: string;
}

const en: Translations = {
  ace: 'Ace',
  aces: 'Aces',
  advanced: 'Advanced',
  advantageRule: 'Advantage Rule',
  aggressiveMargin: 'Aggressive Margin',
  breakPoint: 'Break Point',
  breakPointsConverted: 'Break Points Converted',
  breakPointsSaved: 'Break Points Saved',
  broadcast: 'Broadcast',
  byPlayer: 'By Player',
  cancel: 'Cancel',
  control: 'Control',
  decider: 'Deciding Set',
  doubleFault: 'Double Fault',
  doubleFaults: 'Double Faults',
  doublesMode: 'Doubles',
  downloadJson: 'Download Match JSON',
  duration: 'Duration',
  efficiencyStats: 'Efficiency',
  exit: 'Exit',
  exportImage: 'Export Image',
  exportPdf: 'Export PDF Report',
  fault: 'Fault',
  firstServeIn: '1st Serve In',
  firstServePointsWon: '1st Serve Points Won',
  firstServer: 'First Server',
  forcedError: 'Forced Error',
  forcedErrors: 'Forced Errors',
  gamesPerSet: 'Games / Set',
  journal: 'Journal',
  linkCopied: 'Link Copied',
  live: 'LIVE',
  matchFinished: 'Match Finished',
  matchFormat: 'Match Format',
  matchPoint: 'Match Point',
  matchResult: 'Match Result',
  noAd: 'No-Ad',
  partner1: 'Partner 1',
  partner2: 'Partner 2',
  player1: 'Player 1',
  player2: 'Player 2',
  playerNames: 'Player Names',
  pointWonBy: 'Point Won By',
  pointsWonOnReturn: 'Points Won on Return',
  pointsWonOnServe: 'Points Won on Serve',
  rally: 'Rally',
  returnError: 'Return Error',
  returnFirstServePointsWon: 'vs 1st Serve',
  returnSecondServePointsWon: 'vs 2nd Serve',
  returnStats: 'Return',
  returnWinner: 'Return Winner',
  returnWinners: 'Return Winners',
  secondServe: 'Second Serve',
  secondServePointsWon: '2nd Serve Points Won',
  serviceStats: 'Service',
  serving: 'Serving',
  setPoint: 'Set Point',
  sets: 'Sets',
  setupSubtitle: 'Track stats like a pro',
  setupTitle: 'Court IQ',
  simple: 'Simple',
  singlesMode: 'Singles',
  standard: 'Standard',
  standardSet: 'Standard Set',
  startMatch: 'Start Match',
  stats: 'Stats',
  superTiebreak: 'Super Tiebreak',
  tieBreak: 'Tiebreak',
  to: 'to',
  totalPoints: 'Total Points Won',
  undo: 'Undo',
  unforcedError: 'Unforced Error',
  unforcedErrors: 'Unforced Errors',
  viewerModeReadOnly: 'Viewer Mode • Read Only',
  whoHitIt: 'Who hit it?',
  winner: 'Winner',
  winnerShot: 'Winner',
  winners: 'Winners',
};

const ru: Translations = {
  ace: 'Эйс',
  aces: 'Эйсы',
  advanced: 'Расширенный',
  advantageRule: 'Правило преимущества',
  aggressiveMargin: 'Агрессивный баланс',
  breakPoint: 'Брейк-пойнт',
  breakPointsConverted: 'Реализовано брейк-пойнтов',
  breakPointsSaved: 'Спасено брейк-пойнтов',
  broadcast: 'Трансляция',
  byPlayer: 'По игрокам',
  cancel: 'Отмена',
  control: 'Управление',
  decider: 'Решающий сет',
  doubleFault: 'Двойная ошибка',
  doubleFaults: 'Двойные ошибки',
  doublesMode: 'Парная',
  downloadJson: 'Скачать JSON матча',
  duration: 'Длительность',
  efficiencyStats: 'Эффективность',
  exit: 'Выход',
  exportImage: 'Экспорт изображения',
  exportPdf: 'Экспорт PDF-отчёта',
  fault: 'Ошибка подачи',
  firstServeIn: '1-я подача в корт',
  firstServePointsWon: 'Очки с 1-й подачи',
  firstServer: 'Первая подача',
  forcedError: 'Вынужденная ошибка',
  forcedErrors: 'Вынужденные ошибки',
  gamesPerSet: 'Геймов в сете',
  journal: 'Журнал',
  linkCopied: 'Ссылка скопирована',
  live: 'LIVE',
  matchFinished: 'Матч завершён',
  matchFormat: 'Формат матча',
  matchPoint: 'Матчбол',
  matchResult: 'Результат матча',
  noAd: 'Без преимущества',
  partner1: 'Партнёр 1',
  partner2: 'Партнёр 2',
  player1: 'Игрок 1',
  player2: 'Игрок 2',
  playerNames: 'Имена игроков',
  pointWonBy: 'Очко выиграл(а)',
  pointsWonOnReturn: 'Очки на приёме',
  pointsWonOnServe: 'Очки на подаче',
  rally: 'Розыгрыш',
  returnError: 'Ошибка на приёме',
  returnFirstServePointsWon: 'Против 1-й подачи',
  returnSecondServePointsWon: 'Против 2-й подачи',
  returnStats: 'Приём',
  returnWinner: 'Виннер на приёме',
  returnWinners: 'Виннеры на приёме',
  secondServe: 'Вторая подача',
  secondServePointsWon: 'Очки со 2-й подачи',
  serviceStats: 'Подача',
  serving: 'Подаёт',
  setPoint: 'Сетбол',
  sets: 'Сеты',
  setupSubtitle: 'Ведите статистику как профессионал',
  setupTitle: 'Court IQ',
  simple: 'Простой',
  singlesMode: 'Одиночная',
  standard: 'Стандартный',
  standardSet: 'Обычный сет',
  startMatch: 'Начать матч',
  stats: 'Статистика',
  superTiebreak: 'Супертайбрейк',
  tieBreak: 'Тайбрейк',
  to: 'до',
  totalPoints: 'Всего очков',
  undo: 'Отменить',
  unforcedError: 'Невынужденная ошибка',
  unforcedErrors: 'Невынужденные ошибки',
  viewerModeReadOnly: 'Режим просмотра • Только чтение',
  whoHitIt: 'Кто выполнил удар?',
  winner: 'Победитель',
  winnerShot: 'Виннер',
  winners: 'Виннеры',
};

export const translations: Record<Language, Translations> = { en, ru };
