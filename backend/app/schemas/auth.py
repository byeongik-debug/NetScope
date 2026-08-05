from pydantic import BaseModel, Field, ConfigDict

class LoginIn(BaseModel):
    email: str
    password: str = Field(min_length=1)
    model_config = ConfigDict(populate_by_name=True)

class UserOut(BaseModel):
    id: int
    organization_id: int = Field(alias="organizationId")
    email: str
    display_name: str = Field(alias="displayName")
    role: str
    model_config = ConfigDict(populate_by_name=True)

class TokenOut(BaseModel):
    access_token: str = Field(alias="accessToken")
    token_type: str = Field(default="bearer", alias="tokenType")
    user: UserOut
    model_config = ConfigDict(populate_by_name=True)

class UserCreate(BaseModel):
    email: str
    password: str = Field(min_length=8, max_length=128)
    display_name: str = Field(min_length=1, max_length=100, alias="displayName")
    role: str = Field(default="viewer", pattern="^(admin|operator|viewer)$")
    model_config = ConfigDict(populate_by_name=True)
