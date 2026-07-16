use fcstd_query::{contract_json, execute_command, QueryOptions};
use rusqlite::Connection;

fn main() {
    let args: Vec<String> = std::env::args().collect();
    if args.get(1).map(String::as_str) == Some("--contract") {
        match contract_json() {
            Ok(value) => println!("{value}"),
            Err(error) => fail(&format!("Contract serialization error: {error}"), 70),
        }
        return;
    }
    if args.len() < 3 {
        eprintln!("Usage: fcstd-query <command> <db-path> [options]");
        eprintln!("       fcstd-query --contract");
        std::process::exit(64);
    }

    let command = &args[1];
    let db_path = &args[2];
    let options = parse_options(&args[3..]);
    let conn = match Connection::open(db_path) {
        Ok(conn) => conn,
        Err(error) => fail(&format!("DB open error: {error}"), 66),
    };
    match execute_command(&conn, command, &options) {
        Ok(value) => println!("{value}"),
        Err(error) => fail(&format!("Query error: {error}"), 65),
    }
}

fn parse_options(args: &[String]) -> QueryOptions {
    let mut options = QueryOptions {
        limit: 100,
        ..QueryOptions::default()
    };
    let mut index = 0;
    while index < args.len() {
        match args[index].as_str() {
            "--search" => {
                index += 1;
                options.search = args.get(index).cloned();
            }
            "--kind" => {
                index += 1;
                options.kind = args.get(index).cloned();
            }
            "--offset" => {
                index += 1;
                options.offset = args
                    .get(index)
                    .and_then(|value| value.parse().ok())
                    .unwrap_or(0);
            }
            "--limit" => {
                index += 1;
                options.limit = args
                    .get(index)
                    .and_then(|value| value.parse().ok())
                    .unwrap_or(100);
            }
            "--rel" => {
                index += 1;
                options.rel = args.get(index).cloned();
            }
            _ => {}
        }
        index += 1;
    }
    options
}

fn fail(message: &str, code: i32) -> ! {
    eprintln!("{message}");
    std::process::exit(code);
}
