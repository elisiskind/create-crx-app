import * as chalk from "chalk";
import { Ora, oraPromise } from "ora";

export class Log {
  static info = (message: string, ...more: any[]) => {
    const prettyMessage = chalk.bgBlue(
      " " + message + (more.length > 0 ? " \n" : " ")
    );
    console.info(chalk.bgBlueBright(" INFO "), prettyMessage, ...more);
  };

  static success = (message: string, ...more: any[]) => {
    const prettyMessage = chalk.bgGreen(
      " " + message + (more.length > 0 ? " \n" : " ")
    );
    console.info(chalk.bgGreenBright(" SUCCESS "), prettyMessage, ...more);
  };

  static warn = (message: string, ...more: any[]) => {
    const prettyMessage = chalk.bgYellow(
      " " + message + (more.length > 0 ? " \n" : " ")
    );
    console.warn(chalk.bgYellowBright(" WARN "), prettyMessage, ...more);
  };
  static error = (message: string, ...more: any[]) => {
    const prettyMessage = chalk.bgRed(
      " " + message + (more.length > 0 ? " \n" : " ")
    );
    console.error(
      chalk.bgRedBright.whiteBright(" ERROR "),
      prettyMessage,
      ...more
    );
  };

  static spinner = (
    msg: string,
    task: (ora: Ora) => Promise<any>,
    successText?: string,
    failText?: string
  ) => {
    return oraPromise(task, {
      spinner: "dots",
      interval: 80,
      discardStdin: false,
      text: msg,
      successText,
      failText,
    });
  };
}
