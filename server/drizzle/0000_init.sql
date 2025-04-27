-- Custom SQL migration file, put your code below! --
INSERT INTO "account-types" (id, name, description, balance_type) 
VALUES (1, 'savings', 'regular personal account for savings', 'debit');

INSERT INTO "account-types" (id, name, description, balance_type) 
VALUES (2, 'personal_credit', 'direct deposit credit sum', 'credit');

INSERT INTO "account-types" (id, name, description, balance_type) 
VALUES (3, 'credit_line', 'asigned account credit line', 'credit');

INSERT INTO ledgers (id, currency) VALUES (1001, 'pen');

INSERT INTO ledgers (id, currency) VALUES (1002, 'usd');

INSERT INTO operations (id, name, description) 
VALUES (1001, 'direct_transfer_internal', 'direct transfer between accounts of different users');

INSERT INTO operations (id, name, description) 
VALUES (1002, 'direct_transfer_external', 'direct transfer between accounts of the same user');

INSERT INTO operations (id, name, description) 
VALUES (1003, 'credit_line_payment', 'payment of credit line balance');

INSERT INTO operations (id, name, description) 
VALUES (2001, 'savings_account_create', 'creation of a savings account');

INSERT INTO users (id, name, document_id, role) 
VALUES ('zh4hzl7rzvzw', 'Daniel', '75604110', 'admin');
