from pydantic import BaseModel


class SendReportRequest(BaseModel):
    recipients: list[str]