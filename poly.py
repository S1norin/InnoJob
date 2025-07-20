import asyncio
import aiosmtplib
from email.message import EmailMessage

# --- Ваши учетные данные (не забудьте пароль для приложений) ---
SMTP_HOST = "smtp.mail.ru"
SMTP_PORT = 587
SMTP_USER = "andreyilin03@mail.ru"
SMTP_PASSWORD = "bNbW44MiDmdat1L0ufSw"
RECIPIENT_EMAIL = "a.ilin@innopolis.university"


async def send_email_async():
    """
    Создает и отправляет email-сообщение с использованием aiosmtplib.
    """
    message = EmailMessage()
    message["From"] = SMTP_USER
    message["To"] = RECIPIENT_EMAIL
    message["Subject"] = "Тест: исправленная отправка через порт 587"
    message.set_content("Привет!\n\nЭто сообщение отправлено с исправленным кодом.")

    try:
        # При создании клиента не указываем use_tls=True, т.к. STARTTLS используется
        smtp_client = aiosmtplib.SMTP(hostname=SMTP_HOST, port=SMTP_PORT)

        # Подключаемся. Автоматическое обновление до TLS произойдет здесь.
        await smtp_client.connect()

        # Вызов starttls() был убран, так как он больше не нужен.

        # Сразу авторизуемся на сервере
        await smtp_client.login(SMTP_USER, SMTP_PASSWORD)

        # Отправляем сообщение
        await smtp_client.send_message(message)

        print("Сообщение успешно отправлено!")

    except aiosmtplib.SMTPException as e:
        print(f"Ошибка при отправке письма: {e}")
    finally:
        # Гарантированно закрываем соединение
        if 'smtp_client' in locals() and smtp_client.is_connected:
            await smtp_client.quit()


# Запускаем асинхронную функцию
if __name__ == "__main__":
    asyncio.run(send_email_async())
