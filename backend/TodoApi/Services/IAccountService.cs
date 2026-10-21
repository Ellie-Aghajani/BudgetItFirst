namespace TodoApi.Services;

public interface IAccountService
{
    // Deletes everything the user owns: spending, shopping items, categories,
    // monthly reports and budget settings. All or nothing.
    Task DeleteAllDataAsync(string userId);
}
